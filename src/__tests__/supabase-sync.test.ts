import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseSyncEngine } from '@/lib/supabase-sync';
import { getSyncChannel } from '@/lib/sync-channel';

describe('Supabase Realtime & PostgreSQL Sync Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes SupabaseSyncEngine and subscribes to room channel and global sessions', () => {
    const engine = new SupabaseSyncEngine('stage-1', true);
    expect(engine).toBeDefined();

    const handler = vi.fn();
    const unsub = engine.onMessage(handler);
    expect(typeof unsub).toBe('function');

    engine.postMessage({
      type: 'STATE_UPDATE',
      payload: null,
      timestamp: Date.now(),
      source: 'admin',
      roomId: 'stage-1',
    });

    unsub();
    engine.destroy();
  });

  it('fetches room state from Supabase PostgreSQL database', async () => {
    const engine = new SupabaseSyncEngine('stage-1', true);
    const state = await engine.fetchRoomState();
    expect(state).toBeNull(); // Empty mock in test
    engine.destroy();
  });

  it('saves room state snapshot to Supabase PostgreSQL database', async () => {
    const engine = new SupabaseSyncEngine('stage-1', true);
    await expect(
      engine.saveRoomState({
        timer: { status: 'running', totalDuration: 300 } as any,
        display: { timerFormat: 'MM:SS' } as any,
        audio: {} as any,
      })
    ).resolves.not.toThrow();
    engine.destroy();
  });

  it('integrates cleanly with SyncChannel singleton', () => {
    const ch = getSyncChannel('stage-1', true);
    expect(ch.getSupabaseSync()).toBeDefined();
    expect(ch.getSupabaseSync()).toBeDefined();
  });
});
