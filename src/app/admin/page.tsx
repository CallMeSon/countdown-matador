'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  EventSession,
  getSessionRegistry,
  fetchRemoteSessions,
  createSession,
  updateSession,
  deleteSession,
  regenerateSessionToken,
  isPinTaken,
} from '@/lib/session-registry';
import { getSyncChannel } from '@/lib/sync-channel';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rate-limiter';

const DEFAULT_MASTER_ID = 'admin';
const DEFAULT_MASTER_PASSWORD = 'matador2026';
const MASTER_ID_STORAGE_KEY = 'matador_master_admin_id';
const MASTER_PASSWORD_STORAGE_KEY = 'matador_master_admin_password';
const MASTER_UNLOCKED_SESSION_KEY = 'matador_master_unlocked';

export default function MasterAdminPage() {
  // Master Security Gate State
  const [isMasterUnlocked, setIsMasterUnlocked] = useState<boolean>(false);
  const [masterIdInput, setMasterIdInput] = useState<string>('');
  const [masterPasswordInput, setMasterPasswordInput] = useState<string>('');
  const [masterError, setMasterError] = useState<string | null>(null);
  const [masterCredentials, setMasterCredentials] = useState<{ id: string; password: string }>({
    id: DEFAULT_MASTER_ID,
    password: DEFAULT_MASTER_PASSWORD,
  });
  const [showChangeMasterPinModal, setShowChangeMasterPinModal] = useState<boolean>(false);
  const [newMasterId, setNewMasterId] = useState<string>('');
  const [newMasterPassword, setNewMasterPassword] = useState<string>('');
  const [changeMasterError, setChangeMasterError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState(() => checkRateLimit('master_admin'));

  // Sessions CRUD State
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSession, setEditingSession] = useState<EventSession | null>(null);
  const [selectedQrSession, setSelectedQrSession] = useState<EventSession | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  // Form states for Create
  const [newTitle, setNewTitle] = useState('');
  const [newId, setNewId] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newDurationMin, setNewDurationMin] = useState(15);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states for Edit
  const [editTitle, setEditTitle] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editDurationMin, setEditDurationMin] = useState(15);
  const [editError, setEditError] = useState<string | null>(null);

  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Load master credentials and unlock state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMasterCredentials({
        id: localStorage.getItem(MASTER_ID_STORAGE_KEY) || DEFAULT_MASTER_ID,
        password: localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY) || DEFAULT_MASTER_PASSWORD,
      });

      const isUnlocked = sessionStorage.getItem(MASTER_UNLOCKED_SESSION_KEY) === 'true';
      setIsMasterUnlocked(isUnlocked);
    }
  }, []);

  // Cooldown timer for master lockout
  useEffect(() => {
    const timer = setInterval(() => {
      const current = checkRateLimit('master_admin');
      setRateLimit(current);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const reloadSessions = () => {
    setSessions(getSessionRegistry());
  };

  // Load sessions from Supabase and listen for realtime updates
  useEffect(() => {
    reloadSessions();
    fetchRemoteSessions().then((remote) => {
      if (remote && remote.length > 0) {
        setSessions(remote);
      }
    });

    const handleUpdated = (e: any) => {
      if (e.detail) {
        setSessions(e.detail);
      } else {
        reloadSessions();
      }
    };
    window.addEventListener('matador_sessions_updated', handleUpdated);

    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    }, 1000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('matador_sessions_updated', handleUpdated);
    };
  }, []);

  const broadcastAll = () => {
    const ch = getSyncChannel('global', true);
    ch.getSupabaseSync()?.broadcastSessionRegistry(getSessionRegistry());
  };

  // ============================================================
  // Master Unlock & Lock Handlers
  // ============================================================

  const handleMasterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (rateLimit.isLocked) return;

    if (masterIdInput.trim() === masterCredentials.id && masterPasswordInput === masterCredentials.password) {
      resetRateLimit('master_admin');
      setIsMasterUnlocked(true);
      setMasterError(null);
      setMasterIdInput('');
      setMasterPasswordInput('');
      try {
        sessionStorage.setItem(MASTER_UNLOCKED_SESSION_KEY, 'true');
      } catch {}
    } else {
      const updatedLimit = recordFailedAttempt('master_admin');
      setRateLimit(updatedLimit);
      setMasterPasswordInput('');
      if (updatedLimit.isLocked) {
        setMasterError(`Terlalu banyak percobaan gagal. Master Hub terkunci selama ${updatedLimit.lockRemainingSeconds} detik.`);
      } else {
        setMasterError(`ID atau password salah! Sisa percobaan: ${updatedLimit.attemptsLeft}`);
      }
    }
  };

  const handleLockMaster = () => {
    setIsMasterUnlocked(false);
    try {
      sessionStorage.removeItem(MASTER_UNLOCKED_SESSION_KEY);
    } catch {}
  };

  const handleSaveNewMasterCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterId.trim()) {
      setChangeMasterError('ID admin tidak boleh kosong!');
      return;
    }
    if (newMasterPassword.length < 4) {
      setChangeMasterError('Password minimal 4 karakter!');
      return;
    }
    const next = { id: newMasterId.trim(), password: newMasterPassword };
    setMasterCredentials(next);
    try {
      localStorage.setItem(MASTER_ID_STORAGE_KEY, next.id);
      localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, next.password);
    } catch {}
    setShowChangeMasterPinModal(false);
    setNewMasterId('');
    setNewMasterPassword('');
    setChangeMasterError(null);
    alert('Kredensial Master Admin berhasil diperbarui!');
  };

  // ============================================================
  // Session CRUD Handlers
  // ============================================================

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newTitle.trim()) return;

    const pinToUse = newPin.trim() || '1234';

    // Validate Unique PIN
    const { taken, existingSession } = isPinTaken(pinToUse);
    if (taken && existingSession) {
      setCreateError(`PIN "${pinToUse}" sudah digunakan oleh sesi "${existingSession.title}". Gunakan PIN unik lain!`);
      return;
    }

    const slug = newId.trim()
      ? newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : newTitle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').substring(0, 20);

    createSession({
      id: slug || `sesi-${Date.now().toString(36)}`,
      title: newTitle.trim(),
      pin: pinToUse,
      defaultDuration: (newDurationMin || 15) * 60,
    });

    setNewTitle('');
    setNewId('');
    setNewPin('');
    setNewDurationMin(15);
    setShowCreateModal(false);
    reloadSessions();
    broadcastAll();
  };

  const handleOpenEditModal = (session: EventSession) => {
    setEditingSession(session);
    setEditTitle(session.title);
    setEditPin(session.pin);
    setEditDurationMin(Math.round((session.defaultDuration || 900) / 60));
    setEditError(null);
  };

  const handleSaveEditSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setEditError(null);

    const pinToUse = editPin.trim();
    if (!pinToUse) {
      setEditError('PIN tidak boleh kosong!');
      return;
    }

    // Validate Unique PIN (exclude current session being edited)
    const { taken, existingSession } = isPinTaken(pinToUse, editingSession.id);
    if (taken && existingSession) {
      setEditError(`PIN "${pinToUse}" sudah digunakan oleh sesi "${existingSession.title}". Gunakan PIN unik lain!`);
      return;
    }

    updateSession(editingSession.id, {
      title: editTitle.trim() || editingSession.title,
      pin: pinToUse,
      defaultDuration: (editDurationMin || 15) * 60,
    });

    setEditingSession(null);
    reloadSessions();
    broadcastAll();
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus sesi "${title}" (${id})? Data yang dihapus tidak bisa dikembalikan.`)) {
      deleteSession(id);
      reloadSessions();
      broadcastAll();
    }
  };

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyLink = (session: EventSession) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const displayUrl = `${origin}/timer/${session.token}/`;
    navigator.clipboard.writeText(displayUrl);
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetToken = (session: EventSession) => {
    if (!confirm(`Buat ulang link layar untuk "${session.title}"? Link lama akan berhenti bekerja.`)) return;
    regenerateSessionToken(session.id);
    reloadSessions();
    broadcastAll();
  };

  // ============================================================
  // Download Handlers (QR PNG & Backup JSON)
  // ============================================================

  const downloadQrCodePng = (sessionId: string, title: string) => {
    if (typeof window === 'undefined') return;
    const svg = document.getElementById('qr-code-svg-element') as SVGGraphicsElement | null;
    if (!svg) {
      alert('Gagal mengambil elemen QR Code.');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = 600;
        canvas.height = 600;
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 50, 50, 500, 500);

          const pngFile = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.download = `QR-${sessionId}-${title.replace(/[^a-z0-9_-]/gi, '_')}.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
        }
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Download QR PNG error:', err);
      alert('Gagal mengunduh gambar QR Code.');
    }
  };

  const handleExportBackupJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `matador-sessions-backup-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // ============================================================
  // RENDER: Master Security Gate (If Locked)
  // ============================================================

  if (!isMasterUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-zinc-900 to-black text-white font-inter flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-black select-none">
        <div className="max-w-sm w-full bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
          
          {/* Header Badge */}
          <div className="space-y-2">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border shadow-inner mx-auto ${
              rateLimit.isLocked
                ? 'bg-red-950/80 border-red-500/50 text-red-400 animate-pulse'
                : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white uppercase">
              Master Admin Gate
            </h1>
            <p className="text-xs text-zinc-400">
              Masuk dengan ID &amp; password untuk mengelola sesi, PIN, dan link layar panggung.
            </p>
          </div>

          {/* Lockout Warning */}
          {rateLimit.isLocked ? (
            <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-5 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-bold uppercase tracking-wider">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Akses Master Terkunci</span>
              </div>
              <p className="text-xs text-zinc-300">
                Terlalu banyak percobaan Master PIN salah. Silakan tunggu:
              </p>
              <div className="text-2xl font-mono font-bold text-red-400 animate-pulse pt-1">
                {Math.floor(rateLimit.lockRemainingSeconds / 60).toString().padStart(2, '0')}:{(rateLimit.lockRemainingSeconds % 60).toString().padStart(2, '0')}
              </div>
            </div>
          ) : (
            /* ID + Password Form */
            <form onSubmit={handleMasterSubmit} className="space-y-4 text-left">
              <div>
                <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5 uppercase tracking-wider">
                  ID Admin
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={masterIdInput}
                  onChange={(e) => {
                    setMasterIdInput(e.target.value);
                    setMasterError(null);
                  }}
                  placeholder="admin"
                  className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={masterPasswordInput}
                  onChange={(e) => {
                    setMasterPasswordInput(e.target.value);
                    setMasterError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none"
                />
              </div>

              {masterError && (
                <div className="text-xs text-red-400 font-semibold animate-shake">
                  {masterError}
                </div>
              )}

              <button
                type="submit"
                disabled={!masterIdInput || !masterPasswordInput}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/20 uppercase tracking-wider transition-all"
              >
                Buka Master Hub
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-zinc-800/80">
            <Link
              href="/"
              className="text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors uppercase tracking-wider font-semibold"
            >
              Kembali ke Gateway (/)
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Master Admin Main Dashboard (When Unlocked)
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-zinc-900 to-black text-zinc-100 font-inter p-4 md:p-8 selection:bg-cyan-500 selection:text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Station */}
        <header className="bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase">
                  Matador Master Admin Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                  Master Control
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Pusat Manajemen Multi-Sesi, Edit PIN Keamanan, & Distribusi Sinyal Layar Panggung.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-black/60 border border-zinc-800 px-3 py-1.5 rounded-xl text-right">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Waktu Server</span>
              <span className="font-mono text-cyan-400 font-bold text-xs">{currentTime || '00:00:00 WIB'}</span>
            </div>

            <button
              onClick={() => {
                setCreateError(null);
                setShowCreateModal(true);
              }}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 uppercase tracking-wider"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Buat Sesi</span>
            </button>

            <button
              onClick={handleExportBackupJson}
              title="Unduh Data Sesi sebagai File JSON"
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 uppercase tracking-wider"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Backup JSON</span>
            </button>

            <button
              onClick={() => {
                setNewMasterId(masterCredentials.id);
                setNewMasterPassword('');
                setChangeMasterError(null);
                setShowChangeMasterPinModal(true);
              }}
              title="Ganti ID & Password Admin"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-300 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>

            <button
              onClick={handleLockMaster}
              title="Kunci Panel Master Admin"
              className="p-2 bg-red-950/50 hover:bg-red-900 border border-red-800/60 text-red-300 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Status Counter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <span className="text-xs text-zinc-400 block font-medium">Total Sesi Terdaftar</span>
            <span className="text-2xl font-bold text-cyan-400 mt-1 block font-mono">{sessions.length} Sesi Aktif</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <span className="text-xs text-zinc-400 block font-medium">Protokol Keamanan</span>
            <span className="text-xs font-bold text-emerald-400 mt-2 block flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> PIN Unik & Master Lockout
            </span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <span className="text-xs text-zinc-400 block font-medium">Sinkronisasi Multi-Device</span>
            <span className="text-xs font-bold text-cyan-400 mt-2 block flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Supabase Realtime & PostgreSQL
            </span>
          </div>
        </div>

        {/* Session Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Daftar Sesi Panggung Aktif
            </h2>
            <span className="text-xs text-zinc-500">
              Setiap sesi memiliki PIN unik dan terisolasi secara mandiri
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-12 text-center space-y-4">
              <p className="text-zinc-400 text-sm">Belum ada sesi yang dibuat.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider"
              >
                Buat Sesi Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sessions.map((session) => {
                const isRevealed = !!revealedPins[session.id];
                const isCopied = copiedId === session.id;

                return (
                  <div
                    key={session.id}
                    className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 md:p-6 shadow-xl transition-all flex flex-col justify-between gap-5 relative overflow-hidden group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded uppercase">
                            Room ID: {session.id}
                          </span>
                          <h3 className="text-lg font-bold text-white mt-2 leading-tight">
                            {session.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Edit Session Button */}
                          <button
                            onClick={() => handleOpenEditModal(session)}
                            className="p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-950/40 rounded-lg transition-colors"
                            title="Edit Sesi & PIN"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Session Button */}
                          <button
                            onClick={() => handleDelete(session.id, session.title)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                            title="Hapus Sesi"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Security PIN Display */}
                      <div className="bg-black/50 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 font-medium">PIN Sesi:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm tracking-wider text-amber-300">
                              {isRevealed ? session.pin : '••••'}
                            </span>
                            <button
                              onClick={() => togglePinReveal(session.id)}
                              className="text-zinc-500 hover:text-zinc-300 p-0.5"
                              title={isRevealed ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                            >
                              {isRevealed ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        <span className="text-[11px] text-zinc-500">
                          Durasi: {Math.round((session.defaultDuration || 900) / 60)} Menit
                        </span>
                      </div>
                    </div>

                    {/* Quick Access Action Grid */}
                    <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Operator Console */}
                        <Link
                          href={`/control?room=${session.id}`}
                          className="py-2.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-950 flex items-center justify-center gap-1.5 uppercase tracking-wider"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                          <span>Panel Operator</span>
                        </Link>

                        {/* Stage TV Display */}
                        <a
                          href={`/timer/${session.token}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>Layar Panggung</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* QR Code */}
                        <button
                          onClick={() => setSelectedQrSession(session)}
                          className="flex-1 py-1.5 bg-black/40 hover:bg-black/60 border border-zinc-800 rounded-lg text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1 font-semibold"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          <span>QR Code</span>
                        </button>

                        {/* Copy Direct Link */}
                        <button
                          onClick={() => copyLink(session)}
                          className="flex-1 py-1.5 bg-black/40 hover:bg-black/60 border border-zinc-800 rounded-lg text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1 font-semibold"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>{isCopied ? 'Disalin!' : 'Salin URL'}</span>
                        </button>

                        {/* Reset Token */}
                        <button
                          onClick={() => handleResetToken(session)}
                          title="Buat ulang link layar panggung (link lama berhenti bekerja)"
                          className="py-1.5 px-2.5 bg-black/40 hover:bg-black/60 border border-zinc-800 rounded-lg text-zinc-400 hover:text-amber-300 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ============================================================ */}
      {/* Modal: Buat Sesi Baru */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Buat Sesi Panggung Baru
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300 font-semibold animate-shake">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1.5 uppercase tracking-wider">
                  Nama Sesi / Judul Acara:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Panggung Utama (Main Stage)"
                  className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1.5 uppercase tracking-wider">
                    Room ID Slug (URL):
                  </label>
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="main-stage"
                    className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1.5 uppercase tracking-wider">
                    PIN Akses (Wajib Unik):
                  </label>
                  <input
                    type="text"
                    required
                    value={newPin}
                    onChange={(e) => {
                      setNewPin(e.target.value);
                      setCreateError(null);
                    }}
                    placeholder="1234"
                    maxLength={8}
                    className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1.5 uppercase tracking-wider">
                  Durasi Awal (Menit):
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={newDurationMin}
                  onChange={(e) => setNewDurationMin(parseInt(e.target.value) || 15)}
                  className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all"
                >
                  Simpan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Modal: Edit Sesi */}
      {/* ============================================================ */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Edit Sesi Acara
                </h3>
                <span className="text-[11px] font-mono text-cyan-400">ID: {editingSession.id}</span>
              </div>
              <button
                onClick={() => setEditingSession(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300 font-semibold animate-shake">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditSession} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1.5 uppercase tracking-wider">
                  Nama Sesi / Judul Acara:
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1.5 uppercase tracking-wider">
                    PIN Akses (Wajib Unik):
                  </label>
                  <input
                    type="text"
                    required
                    value={editPin}
                    onChange={(e) => {
                      setEditPin(e.target.value);
                      setEditError(null);
                    }}
                    maxLength={8}
                    className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-xs font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1.5 uppercase tracking-wider">
                    Durasi Awal (Menit):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={editDurationMin}
                    onChange={(e) => setEditDurationMin(parseInt(e.target.value) || 15)}
                    className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-white text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Modal: QR Code + Download PNG */}
      {/* ============================================================ */}
      {selectedQrSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                QR Code Layar Panggung
              </h3>
              <p className="text-xs text-zinc-400">
                Scan QR Code ini untuk membuka layar panggung <strong>{selectedQrSession.title}</strong>.
              </p>
            </div>

            <div ref={qrContainerRef} className="p-4 bg-white rounded-2xl shadow-xl inline-block mx-auto">
              <QRCodeSVG
                id="qr-code-svg-element"
                value={`${origin}/timer/${selectedQrSession.token}/`}
                size={180}
                level="H"
              />
            </div>

            <div className="p-2.5 bg-black/60 border border-zinc-800 rounded-xl">
              <span className="text-[11px] font-mono text-cyan-400 break-all select-all block">
                {`${origin}/timer/${selectedQrSession.token}/`}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => downloadQrCodePng(selectedQrSession.id, selectedQrSession.title)}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Unduh Gambar QR (PNG)</span>
              </button>

              <button
                onClick={() => setSelectedQrSession(null)}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Modal: Ganti Master PIN */}
      {/* ============================================================ */}
      {showChangeMasterPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Ganti ID &amp; Password Admin
              </h3>
              <p className="text-xs text-zinc-400">
                Kredensial ini digunakan untuk mengunci dan membuka seluruh halaman Master Admin Hub.
              </p>
            </div>

            {changeMasterError && (
              <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300 font-semibold animate-shake">
                {changeMasterError}
              </div>
            )}

            <form onSubmit={handleSaveNewMasterCredentials} className="space-y-4 text-left">
              <div>
                <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5 uppercase tracking-wider">
                  ID Admin Baru
                </label>
                <input
                  type="text"
                  required
                  value={newMasterId}
                  onChange={(e) => {
                    setNewMasterId(e.target.value);
                    setChangeMasterError(null);
                  }}
                  className="w-full bg-black/60 border border-zinc-800 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-amber-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5 uppercase tracking-wider">
                  Password Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newMasterPassword}
                  onChange={(e) => {
                    setNewMasterPassword(e.target.value);
                    setChangeMasterError(null);
                  }}
                  placeholder="Minimal 4 karakter"
                  className="w-full bg-black/60 border border-zinc-800 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-amber-300 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangeMasterPinModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
