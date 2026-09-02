import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase Client & Realtime for Tests
vi.mock('@/lib/supabase', () => {
  const createMockChannel = () => {
    const ch: any = {
      on: vi.fn(() => ch),
      subscribe: vi.fn((cb) => {
        if (cb) cb('SUBSCRIBED');
        return ch;
      }),
      track: vi.fn().mockResolvedValue('ok'),
      untrack: vi.fn().mockResolvedValue('ok'),
      presenceState: vi.fn().mockReturnValue({}),
      send: vi.fn().mockResolvedValue({ error: null }),
    };
    return ch;
  };

  const createQueryBuilder = () => {
    const qb: any = {
      select: vi.fn(() => qb),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      eq: vi.fn(() => qb),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => qb),
      delete: vi.fn(() => qb),
      then: (resolve: any, reject: any) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
      catch: (reject: any) => Promise.resolve({ data: null, error: null }).catch(reject),
    };
    return qb;
  };

  const mockSupabase = {
    channel: vi.fn(() => createMockChannel()),
    removeChannel: vi.fn(),
    from: vi.fn(() => createQueryBuilder()),
  };

  return {
    getSupabase: () => mockSupabase,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
  };
});

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Set<(event: MessageEvent) => void> = new Set();
  static channels: Map<string, Set<MockBroadcastChannel>> = new Map();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: any) {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) {
      peers.forEach((peer) => {
        if (peer !== this) {
          const event = new MessageEvent('message', { data });
          if (peer.onmessage) {
            peer.onmessage(event);
          }
          peer.listeners.forEach((listener) => listener(event));
        }
      });
    }
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  }

  close() {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) {
      peers.delete(this);
    }
    this.listeners.clear();
    this.onmessage = null;
  }
}

(globalThis as any).BroadcastChannel = MockBroadcastChannel;

// Mock Web Audio API
class MockAudioContext {
  currentTime = 0;
  destination = {};
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
}

(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext;

// Mock HTMLMediaElement
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};
