import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSyncChannel, SyncChannel } from '@/lib/sync-channel';
import { SyncMessage } from '@/types/timer';

describe('SyncChannel', () => {
  let channel: SyncChannel;

  beforeEach(() => {
    channel = getSyncChannel();
  });

  afterEach(() => {
    channel.close();
  });

  it('should create singleton channel instance', () => {
    const channel2 = getSyncChannel();
    expect(channel).toBe(channel2);
  });

  it('should post message and receive via listener in other instance', () => {
    const channelA = new SyncChannel();
    const channelB = new SyncChannel();
    const handler = vi.fn();

    const unsubscribe = channelB.onMessage(handler);

    const testMsg: SyncMessage = {
      type: 'STATE_UPDATE',
      payload: { test: 123 },
      timestamp: Date.now(),
      source: 'admin',
    };

    channelA.postMessage(testMsg);

    expect(handler).toHaveBeenCalledWith(testMsg);
    unsubscribe();
    channelA.close();
    channelB.close();
  });

  it('should allow unsubscribing from messages', () => {
    const channelA = new SyncChannel();
    const channelB = new SyncChannel();
    const handler = vi.fn();

    const unsubscribe = channelB.onMessage(handler);
    unsubscribe();

    const testMsg: SyncMessage = {
      type: 'STATE_UPDATE',
      payload: {},
      timestamp: Date.now(),
      source: 'display',
    };

    channelA.postMessage(testMsg);
    expect(handler).not.toHaveBeenCalled();

    channelA.close();
    channelB.close();
  });
});
