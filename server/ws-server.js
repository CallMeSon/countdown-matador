'use strict';

// Standalone WebSocket relay for the matador-timer static frontend.
// Deliberately dumb: never computes timer state, only stores the last
// full TimerState any client sent per room and fans it out to everyone
// else in that same room. Kept as plain CommonJS (no TS, no build step)
// so it runs directly via `node server/ws-server.js`, outside Next's
// bundler / @/* alias resolution.

const fs = require('fs');
const path = require('path');
const { parse: parseUrl } = require('url');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 8081);
const STATE_FILE = process.env.STATE_FILE || path.join(__dirname, 'state.json');
const HEARTBEAT_MS = 30000;
const PRUNE_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

const DEFAULT_STATE = {
  status: 'idle',
  duration: 300,
  startedAt: null,
  pausedRemaining: null,
  displayMode: 'timer',
  stageMessage: null,
  appearance: {
    bgMode: 'color',
    bgColor: '#000000',
    bgImage: '',
    fontFamily: 'default',
    bold: false,
    italic: false,
    fontColor: '#ffffff',
  },
};

/** rooms: Map<roomId, { state: TimerState, clients: Set<WebSocket>, updatedAt: number }> */
const rooms = new Map();

function loadRooms() {
  let raw;
  try {
    raw = fs.readFileSync(STATE_FILE, 'utf8');
  } catch {
    return; // belum ada file, mulai kosong
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== 'object') return;
  for (const [roomId, entry] of Object.entries(parsed)) {
    if (
      entry &&
      typeof entry === 'object' &&
      entry.state &&
      typeof entry.state === 'object' &&
      typeof entry.state.status === 'string' &&
      typeof entry.updatedAt === 'number'
    ) {
      rooms.set(roomId, { state: entry.state, clients: new Set(), updatedAt: entry.updatedAt });
    }
    // entry gak sesuai shape (misal file lama format flat pre-room) -> skip diam-diam
  }
}
loadRooms();

let lastWrittenJson = null;

function persistRooms() {
  const plain = {};
  for (const [roomId, room] of rooms) {
    plain[roomId] = { state: room.state, updatedAt: room.updatedAt };
  }
  const json = JSON.stringify(plain);
  if (json === lastWrittenJson) return;
  lastWrittenJson = json;
  fs.writeFile(STATE_FILE, json, (err) => {
    if (err) console.error('[timer-ws] failed to persist state:', err.message);
  });
}

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = { state: { ...DEFAULT_STATE }, clients: new Set(), updatedAt: Date.now() };
    rooms.set(roomId, room);
  }
  return room;
}

const wss = new WebSocket.Server({ port: PORT, host: '127.0.0.1' });
console.log(`[timer-ws] listening on 127.0.0.1:${PORT}, state file: ${STATE_FILE}, rooms loaded: ${rooms.size}`);

function send(socket, msg) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

wss.on('connection', (socket, req) => {
  const query = parseUrl(req.url, true).query;
  const roomId = typeof query.room === 'string' ? query.room.trim() : '';

  if (!roomId) {
    socket.close(1008, 'room required');
    return;
  }

  const room = getOrCreateRoom(roomId);
  socket.roomId = roomId;
  socket.isAlive = true;
  room.clients.add(socket);

  socket.on('pong', () => { socket.isAlive = true; });

  // Push-on-connect: newcomer immediately gets the room's current state.
  send(socket, { type: 'STATE', state: room.state });

  socket.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    const currentRoom = rooms.get(socket.roomId);
    if (!currentRoom) return;

    if (msg.type === 'STATE' && msg.state && typeof msg.state === 'object') {
      // Pesan dari client lama bisa datang tanpa `appearance`; jangan biarkan itu
      // menghapus styling room. Pakai appearance baru kalau ada, kalau tidak
      // pertahankan punya room, dan selalu isi field yang hilang dari default.
      const baseAppearance =
        (currentRoom.state && currentRoom.state.appearance) || DEFAULT_STATE.appearance;
      currentRoom.state = {
        ...DEFAULT_STATE,
        ...msg.state,
        appearance: { ...DEFAULT_STATE.appearance, ...(msg.state.appearance || baseAppearance) },
      };
      currentRoom.updatedAt = Date.now();
      persistRooms();
      // Fan out ke client lain di room yang sama, jangan echo ke pengirim.
      currentRoom.clients.forEach((client) => {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
          send(client, { type: 'STATE', state: currentRoom.state });
        }
      });
    } else if (msg.type === 'REQUEST_STATE') {
      send(socket, { type: 'STATE', state: currentRoom.state });
    }
  });

  socket.on('close', () => {
    rooms.get(socket.roomId)?.clients.delete(socket);
  });
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (socket.isAlive === false) {
      socket.terminate();
      return;
    }
    socket.isAlive = false;
    socket.ping();
  });

  let pruned = false;
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (room.clients.size === 0 && now - room.updatedAt > PRUNE_MS) {
      rooms.delete(roomId);
      pruned = true;
    }
  }
  if (pruned) persistRooms();
}, HEARTBEAT_MS);

wss.on('close', () => clearInterval(heartbeat));

process.on('SIGTERM', () => {
  clearInterval(heartbeat);
  // wss.close() nunggu semua koneksi client kebuka nutup sendiri dulu baru
  // callback-nya jalan — kalau ada socket yang nggak nutup bersih (mati listrik
  // di sisi client, dst), ini bisa nggantung selamanya dan bikin restart/deploy
  // nyangkut. Putus paksa semua koneksi dulu, plus timeout jaga-jaga.
  wss.clients.forEach((socket) => socket.terminate());
  wss.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
});
