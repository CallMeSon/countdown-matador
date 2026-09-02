'use client';

// ============================================================
// Hybrid Sync Channel — Local BroadcastChannel + Supabase Realtime & PostgreSQL
// Connects unlimited laptops worldwide with sub-millisecond broadcast
// Automatically syncs Timer state & Multi-Session Registry on Netlify
// ============================================================

import { CHANNEL_NAME, SyncMessage } from '@/types/timer';
import { SupabaseSyncEngine } from './supabase-sync';

type MessageHandler = (message: SyncMessage) => void;
type PeersCountHandler = (count: number) => void;

class SyncChannel {
  private channel: BroadcastChannel | null = null;
  private supabaseSync: SupabaseSyncEngine | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private peersCountHandlers: Set<PeersCountHandler> = new Set();
  private useLocalStorageFallback = false;
  private roomId: string = 'stage-1';
  private isAdmin: boolean = false;
  private storageKey = `${CHANNEL_NAME}_msg`;

  constructor(roomId: string = 'stage-1', isAdmin: boolean = false) {
    this.roomId = (roomId || 'stage-1').trim().toLowerCase();
    this.isAdmin = isAdmin;
    this.storageKey = `${CHANNEL_NAME}_${this.roomId}_msg`;

    if (typeof window === 'undefined') return;

    // 1. Local BroadcastChannel (for tabs on the same laptop)
    try {
      this.channel = new BroadcastChannel(`${CHANNEL_NAME}_${this.roomId}`);
      this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        this.notifyHandlers(event.data);
      };
    } catch {
      this.useLocalStorageFallback = true;
      window.addEventListener('storage', this.handleStorageEvent);
    }

    // 2. Supabase Realtime Sync Engine (for different laptops across the internet)
    try {
      this.supabaseSync = new SupabaseSyncEngine(this.roomId, this.isAdmin);
      this.supabaseSync.onMessage((msg: SyncMessage) => {
        this.notifyHandlers(msg);
      });
      this.supabaseSync.onPeersCountChange((count: number) => {
        this.notifyPeersCount(count);
      });
    } catch {}
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === this.storageKey && event.newValue) {
      try {
        const message: SyncMessage = JSON.parse(event.newValue);
        this.notifyHandlers(message);
      } catch {}
    }
  };

  private notifyHandlers(message: SyncMessage) {
    this.handlers.forEach((handler) => {
      try {
        handler(message);
      } catch (e) {
        console.error('[SyncChannel] Handler error:', e);
      }
    });
  }

  private notifyPeersCount(count: number) {
    this.peersCountHandlers.forEach((handler) => {
      try {
        handler(count);
      } catch {}
    });
  }

  public postMessage(message: SyncMessage): void {
    message.roomId = this.roomId;

    // 1. Post to local tabs
    if (this.channel && !this.useLocalStorageFallback) {
      this.channel.postMessage(message);
    } else if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(message));
      setTimeout(() => localStorage.removeItem(this.storageKey), 50);
    }

    // 2. Post to all remote laptops via Supabase Realtime Broadcast
    if (this.supabaseSync) {
      this.supabaseSync.postMessage(message);
    }
  }

  public getSupabaseSync(): SupabaseSyncEngine | null {
    return this.supabaseSync;
  }

  public onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public onPeersCountChange(handler: PeersCountHandler): () => void {
    this.peersCountHandlers.add(handler);
    return () => {
      this.peersCountHandlers.delete(handler);
    };
  }

  public close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.supabaseSync) {
      this.supabaseSync.destroy();
      this.supabaseSync = null;
    }
    if (this.useLocalStorageFallback && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
    this.handlers.clear();
    this.peersCountHandlers.clear();
  }
}

// Singleton instances keyed by roomId + isAdmin
const instances: Map<string, SyncChannel> = new Map();

export function getSyncChannel(roomId: string = 'stage-1', isAdmin: boolean = false): SyncChannel {
  const key = `${(roomId || 'stage-1').trim().toLowerCase()}_${isAdmin ? 'admin' : 'disp'}`;
  if (!instances.has(key)) {
    instances.set(key, new SyncChannel(roomId, isAdmin));
  }
  return instances.get(key)!;
}

export { SyncChannel };
