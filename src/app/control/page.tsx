'use client';

import { useState } from 'react';
import { AppProvider, useApp } from '@/context/TimerContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioTriggers } from '@/hooks/useAudioTriggers';

// Admin Components
import SyncStatusBar from '@/components/admin/SyncStatusBar';
import ModeSelector from '@/components/admin/ModeSelector';
import DurationInput from '@/components/admin/DurationInput';
import PresetButtons from '@/components/admin/PresetButtons';
import MainControls from '@/components/admin/MainControls';
import SessionInput from '@/components/admin/SessionInput';
import SessionStatus from '@/components/admin/SessionStatus';
import PositionControl from '@/components/admin/PositionControl';
import AppearanceSettings from '@/components/admin/AppearanceSettings';
import WarningThresholds from '@/components/admin/WarningThresholds';
import BackgroundSettings from '@/components/admin/BackgroundSettings';
import LogoSettings from '@/components/admin/LogoSettings';
import OverlaySettings from '@/components/admin/OverlaySettings';
import AudioManager from '@/components/admin/AudioManager';
import CuePanel from '@/components/admin/CuePanel';
import OperatorNotes from '@/components/admin/OperatorNotes';
import EventLog from '@/components/admin/EventLog';
import MiniPreview from '@/components/admin/MiniPreview';
import AdminPinLock from '@/components/admin/AdminPinLock';

// ============================================================
// Tab Configuration
//
// Session CRUD (create/rename/delete rooms, master credentials) lives in
// /admin only — this console is live show control, gated by the session's
// own PIN, nothing more.
// ============================================================

const TABS = [
  { id: 'timer', label: 'Timer' },
  { id: 'display', label: 'Tampilan' },
  { id: 'audio', label: 'Audio' },
  { id: 'cue', label: 'Cue Signal' },
  { id: 'notes', label: 'Log & Catatan' },
] as const;

type TabId = typeof TABS[number]['id'];

// ============================================================
// Operator Content — Mobile-First Scrollable Layout
// ============================================================

function OperatorContent() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('timer');

  useKeyboardShortcuts(false);

  // Lets the operator hear their own cues on this machine too, not just
  // whatever's plugged into the stage display.
  const audioEngine = useAudioEngine(state.audio);
  useAudioTriggers(audioEngine);

  if (!state.room.isUnlocked) {
    return <AdminPinLock />;
  }

  return (
    <div className="w-full min-h-screen bg-matador-panel text-white font-inter flex flex-col">
      {/* ========== TOP HEADER (sticky on all screens) ========== */}
      <div className="sticky top-0 z-20">
        <SyncStatusBar />
      </div>

      {/* ========== TAB NAVIGATION (sticky below header) ========== */}
      <div className="sticky top-[49px] z-10 border-b border-matador-border bg-matador-dark/95 backdrop-blur-sm shrink-0">
        <div className="flex overflow-x-auto scrollbar-hide px-3 md:px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 md:px-5 py-3 text-[11px] md:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap relative ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-matador-card/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========== MAIN CONTENT AREA ========== */}
      {/* On desktop (lg+): side-by-side columns. On mobile: single scrollable column. */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">

        {/* LEFT: Tab Content (scrolls naturally on mobile, overflow-y-auto on desktop) */}
        <div className="flex-1 lg:overflow-y-auto admin-scroll">
          <div className="p-4 md:p-6 space-y-6">
            {activeTab === 'timer' && <TimerTab />}
            {activeTab === 'display' && <DisplayTab />}
            {activeTab === 'audio' && <AudioTab />}
            {activeTab === 'cue' && <CueTab />}
            {activeTab === 'notes' && <NotesTab />}
          </div>
        </div>

        {/* RIGHT: Live Preview & Controls */}
        <div className="w-full lg:w-[420px] xl:w-[460px] bg-matador-dark/80 p-4 flex flex-col gap-4 lg:overflow-y-auto admin-scroll shrink-0 border-t lg:border-t-0 lg:border-l border-matador-border">
          <MiniPreview />
          <SessionStatus />
          <MainControls />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tab: Timer Control
// ============================================================

function TimerTab() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Section title="Mode Timer">
        <ModeSelector />
      </Section>

      <Section title="Preset Durasi Cepat">
        <PresetButtons />
      </Section>

      <Section title="Durasi Kustom / Target Waktu">
        <DurationInput />
      </Section>

      <Section title="Label Sesi Acara">
        <SessionInput />
      </Section>
    </div>
  );
}

// ============================================================
// Tab: Display Settings
// ============================================================

function DisplayTab() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Section title="Posisi Timer di Layar">
        <PositionControl />
      </Section>

      <Section title="Font, Format & Warna">
        <AppearanceSettings />
      </Section>

      <Section title="Peringatan Waktu Bertingkat (Warning Thresholds)">
        <WarningThresholds />
      </Section>

      <Section title="Background Layar Display">
        <BackgroundSettings />
      </Section>

      <Section title="Logo Event / Sponsor">
        <LogoSettings />
      </Section>

      <Section title="Overlay (Progress Bar, Ticker, Tally Light)">
        <OverlaySettings />
      </Section>
    </div>
  );
}

// ============================================================
// Tab: Audio Settings
// ============================================================

function AudioTab() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Section title="Efek Suara & Peringatan Audio">
        <AudioManager />
      </Section>
    </div>
  );
}

// ============================================================
// Tab: Cue Signal
// ============================================================

function CueTab() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Section title="Kirim Sinyal Isyarat ke Pembicara (Cue Signal)">
        <CuePanel />
      </Section>
    </div>
  );
}

// ============================================================
// Tab: Operator Notes & Log
// ============================================================

function NotesTab() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Section title="Catatan & Rundown Acara Operator">
        <OperatorNotes />
      </Section>

      <Section title="Event Log (Riwayat Aksi Real-Time)">
        <EventLog />
      </Section>
    </div>
  );
}

// ============================================================
// Shared Section Wrapper Component
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-matador-card border border-matador-border rounded-xl p-4 md:p-5 space-y-3 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">{title}</h3>
      {children}
    </div>
  );
}

// ============================================================
// Default Export Wrapper
// ============================================================

export default function ControlPage() {
  return (
    <AppProvider isAdmin={true}>
      <OperatorContent />
    </AppProvider>
  );
}
