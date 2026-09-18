/**
 * Dev runner: jalankan relay WebSocket/upload (server/ws-server.js, port 8081)
 * bareng `next dev`. Tanpa dependensi tambahan. Argumen diteruskan ke next dev,
 * mis. `node scripts/dev.mjs -p 3099`.
 *
 * Catatan: di dev, `/upload` di-proxy ke relay oleh rewrite di next.config.mjs,
 * dan file hasil upload disimpan di public/uploads lalu di-serve Next sebagai
 * static. Kalau relay mati, upload akan gagal (ECONNREFUSED) — karena itu
 * keduanya dijalankan bersama di sini.
 */
import { spawn } from 'node:child_process';

const extraArgs = process.argv.slice(2);
const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // sudah mati
    }
  }
  process.exit(code);
}

function run(label, args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  child.on('exit', (code) => {
    console.error(`[dev] ${label} berhenti (kode ${code ?? 0}) — mematikan yang lain`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('relay', ['server/ws-server.js']);
run('next', ['node_modules/next/dist/bin/next', 'dev', ...extraArgs]);
