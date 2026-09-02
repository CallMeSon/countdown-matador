'use client';

import React, { useEffect, useState } from 'react';
import { AppProvider } from '@/context/TimerContext';
import { DisplayContent } from '@/components/display/DisplayView';
import { EventSession, getSessionByToken, fetchRemoteSessions } from '@/lib/session-registry';

// ============================================================
// Stage Display — /timer/<token>
//
// This is a static export, so the token can't be a real Next.js dynamic
// route (it's created at runtime via /admin, long after build). Instead
// netlify.toml rewrites /timer/* to this one static page, and the token is
// read from the URL client-side and resolved against the session registry.
// ============================================================

function readTokenFromPath(): string {
  if (typeof window === 'undefined') return '';
  const segments = window.location.pathname.split('/').filter(Boolean); // ['timer', '<token>']
  return segments[1] || '';
}

export default function TimerPage() {
  const [session, setSession] = useState<EventSession | null | 'loading'>('loading');

  useEffect(() => {
    const token = readTokenFromPath();
    if (!token) {
      setSession(null);
      return;
    }

    const tryResolve = () => setSession(getSessionByToken(token) ?? null);

    tryResolve();
    // Registry may still be a stale local cache on a cold device — refresh
    // from Supabase and re-check once it lands.
    fetchRemoteSessions().then(tryResolve);
    window.addEventListener('matador_sessions_updated', tryResolve);
    return () => window.removeEventListener('matador_sessions_updated', tryResolve);
  }, []);

  if (session === 'loading') {
    return <div className="w-screen h-screen bg-black" />;
  }

  if (!session) {
    return (
      <div className="w-screen h-screen bg-black text-white font-inter flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-zinc-400 uppercase tracking-wider">Sesi Tidak Ditemukan</p>
          <p className="text-xs text-zinc-600">Link ini tidak valid atau sesinya sudah dihapus.</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider isAdmin={false} initialRoomId={session.id}>
      <DisplayContent />
    </AppProvider>
  );
}
