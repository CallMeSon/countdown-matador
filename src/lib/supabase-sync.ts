'use client';

import { RealtimeChannel } from '@supabase/supabase-js';
import { SyncMessage } from '@/types/timer';
import { EventSession, fetchRemoteSessions } from './session-registry';
import { getSupabase } from './supabase';

type MessageHandler = (message: SyncMessage) => void;
type PeersCountHandler = (count: number) => void;
type RegistryUpdateHandler = (sessions: EventSession[]) => void;

export class SupabaseSyncEngine {
  private channel: RealtimeChannel | null = null;
  private globalSessionsChannel: RealtimeChannel | null = null;
  private roomId: string = 'stage-1';
  private isAdmin: boolean = false;
  private clientId: string = '';
  private handlers: Set<MessageHandler> = new Set();
  private peersCountHandlers: Set<PeersCountHandler> = new Set();
  private registryHandlers: Set<RegistryUpdateHandler> = new Set();
  private isDestroyed: boolean = false;
  private isSubscribed: boolean = false;

  constructor(roomId: string, isAdmin: boolean) {
    this.roomId = this.sanitizeRoomId(roomId);
    this.isAdmin = isAdmin;
    this.clientId = `client-${this.isAdmin ? 'admin' : 'disp'}-${Math.random().toString(36).substring(2, 9)}`;

    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private sanitizeRoomId(raw: string): string {
    return (raw || 'stage-1').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  }

  public setRoomId(newRoom: string) {
    const sanitized = this.sanitizeRoomId(newRoom);
    if (sanitized === this.roomId) return;

    // Unsubscribe from old room channel
    if (this.channel) {
      const supabase = getSupabase();
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.isSubscribed = false;
    }

    this.roomId = sanitized;
    this.notifyPeersCount(1);

    if (typeof window !== 'undefined' && !this.isDestroyed) {
      this.subscribeRoomChannel();
    }
  }

  private init() {
    if (typeof window === 'undefined' || this.isDestroyed) return;
    this.subscribeRoomChannel();
    this.subscribeGlobalSessionsChannel();
  }

  private subscribeRoomChannel() {
    const supabase = getSupabase();
    const channelName = `matador-room:${this.roomId}`;

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: this.clientId },
      },
    });

    // 1. Listen for real-time broadcasts
    this.channel.on('broadcast', { event: 'SYNC_MESSAGE' }, (payload) => {
      if (this.isDestroyed) return;
      if (payload && payload.payload) {
        const msg = payload.payload as SyncMessage;
        if (msg.roomId === this.roomId) {
          this.notifyHandlers(msg);
        }
      }
    });

    // 2. Listen for presence sync (count connected laptops & displays)
    this.channel.on('presence', { event: 'sync' }, () => {
      if (this.isDestroyed || !this.channel) return;
      const state = this.channel.presenceState();
      const count = Object.keys(state).length;
      this.notifyPeersCount(Math.max(1, count));
    });

    this.channel.on('presence', { event: 'join' }, () => {
      if (this.isDestroyed || !this.channel) return;
      const state = this.channel.presenceState();
      const count = Object.keys(state).length;
      this.notifyPeersCount(Math.max(1, count));
    });

    this.channel.on('presence', { event: 'leave' }, () => {
      if (this.isDestroyed || !this.channel) return;
      const state = this.channel.presenceState();
      const count = Object.keys(state).length;
      this.notifyPeersCount(Math.max(1, count));
    });

    // 3. Subscribe to channel & track presence
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.isSubscribed = true;
        try {
          await this.channel?.track({
            clientId: this.clientId,
            role: this.isAdmin ? 'admin' : 'display',
            joinedAt: Date.now(),
          });
        } catch {}

        // If stage display or secondary admin, request latest sync
        this.postMessage({
          type: 'REQUEST_SYNC',
          payload: null,
          timestamp: Date.now(),
          source: this.isAdmin ? 'admin' : 'display',
          roomId: this.roomId,
        });
      }
    });
  }

  private subscribeGlobalSessionsChannel() {
    const supabase = getSupabase();
    
    // Subscribe to postgres table changes on public.sessions
    this.globalSessionsChannel = supabase
      .channel('matador-global-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        async () => {
          // Re-fetch all sessions from DB when table updates
          const { data } = await supabase
            .from('sessions')
            .select('*')
            .order('created_at', { ascending: true });
          
          if (data && Array.isArray(data)) {
            const mapped: EventSession[] = data.map((row) => ({
              id: row.id,
              title: row.title,
              pin: row.pin,
              token: row.token || '',
              defaultDuration: row.default_duration,
              createdAt: Number(row.created_at),
              lastActiveAt: Number(row.last_active_at),
            }));
            this.notifyRegistryHandlers(mapped);
          }
        }
      )
      .subscribe();
  }

  // Publish sync message via Supabase Realtime Broadcast
  public postMessage(message: SyncMessage) {
    if (this.isDestroyed || !this.channel) return;
    message.roomId = this.roomId;
    (message as any).senderId = this.clientId;

    this.channel.send({
      type: 'broadcast',
      event: 'SYNC_MESSAGE',
      payload: message,
    }).catch(() => {});
  }

  // Fetch initial room state from Supabase Database
  public async fetchRoomState(): Promise<any | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('room_state')
        .select('*')
        .eq('room_id', this.roomId)
        .single();

      if (error || !data) return null;
      return {
        timer: data.timer_state,
        display: data.display_config,
        audio: data.audio_config,
        operatorNotes: data.operator_notes,
        activeCue: data.active_cue,
        quickMessage: data.quick_message,
      };
    } catch {
      return null;
    }
  }

  // Save room state snapshot to Supabase Database
  public async saveRoomState(stateSnapshot: {
    timer: any;
    display: any;
    audio: any;
    operatorNotes?: string;
    activeCue?: string | null;
    quickMessage?: any | null;
  }) {
    if (!this.isAdmin) return;
    try {
      const supabase = getSupabase();
      await supabase.from('room_state').upsert(
        {
          room_id: this.roomId,
          timer_state: stateSnapshot.timer,
          display_config: stateSnapshot.display,
          audio_config: stateSnapshot.audio,
          operator_notes: stateSnapshot.operatorNotes || '',
          active_cue: stateSnapshot.activeCue || null,
          quick_message: stateSnapshot.quickMessage || null,
          updated_at: Date.now(),
        },
        { onConflict: 'room_id' }
      );
    } catch (err) {
      console.error('[SupabaseSyncEngine] Error saving room state to DB:', err);
    }
  }

  // Compatibility helper methods for global session sync
  public requestSessionRegistry() {
    fetchRemoteSessions().then((sessions) => {
      if (sessions && sessions.length > 0) {
        this.notifyRegistryHandlers(sessions);
      }
    });
  }

  public broadcastSessionRegistry(sessions: EventSession[]) {
    this.notifyRegistryHandlers(sessions);
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

  public onRegistryUpdate(handler: RegistryUpdateHandler): () => void {
    this.registryHandlers.add(handler);
    return () => {
      this.registryHandlers.delete(handler);
    };
  }

  private notifyHandlers(message: SyncMessage) {
    this.handlers.forEach((h) => {
      try {
        h(message);
      } catch (e) {
        console.error('[SupabaseSyncEngine] handler error:', e);
      }
    });
  }

  private notifyPeersCount(count: number) {
    this.peersCountHandlers.forEach((h) => {
      try {
        h(count);
      } catch {}
    });
  }

  private notifyRegistryHandlers(sessions: EventSession[]) {
    this.registryHandlers.forEach((h) => {
      try {
        h(sessions);
      } catch {}
    });
  }

  public destroy() {
    this.isDestroyed = true;
    const supabase = getSupabase();
    if (this.channel) {
      try { supabase.removeChannel(this.channel); } catch {}
      this.channel = null;
    }
    if (this.globalSessionsChannel) {
      try { supabase.removeChannel(this.globalSessionsChannel); } catch {}
      this.globalSessionsChannel = null;
    }
    this.handlers.clear();
    this.peersCountHandlers.clear();
    this.registryHandlers.clear();
  }
}
