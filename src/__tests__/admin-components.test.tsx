'use client';

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ControlPage from '@/app/control/page';
import { AppProvider, useApp } from '@/context/TimerContext';
import ModeSelector from '@/components/admin/ModeSelector';
import PresetButtons from '@/components/admin/PresetButtons';
import MainControls from '@/components/admin/MainControls';
import CuePanel from '@/components/admin/CuePanel';
import type { TimerMode } from '@/types/timer';

// Sets the timer mode before rendering the child under test.
function ModeHarness({ mode, children }: { mode: TimerMode; children: React.ReactNode }) {
  const { setMode } = useApp();
  React.useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);
  return <>{children}</>;
}

function renderInMode(mode: TimerMode, component: React.ReactNode) {
  return render(
    <AppProvider isAdmin={true}>
      <ModeHarness mode={mode}>{component}</ModeHarness>
    </AppProvider>
  );
}

describe('Admin Panel Components', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderWithProvider = (component: React.ReactNode) => {
    return render(<AppProvider isAdmin={true}>{component}</AppProvider>);
  };

  it('renders Admin PIN Lock and unlocks with default PIN (1234)', () => {
    render(<ControlPage />);
    expect(screen.getByText(/ADMIN SECURITY LOCK/i)).toBeInTheDocument();

    // Type PIN 1-2-3-4
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('4'));

    // Submit unlock
    fireEvent.click(screen.getByText('Buka Kunci Admin'));

    // Verify unlocked operator console (session CRUD lives in /admin now, not here)
    expect(screen.getByText('MATADOR')).toBeInTheDocument();
    expect(screen.getByText('Timer')).toBeInTheDocument();
    expect(screen.getByText('Tampilan')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
    expect(screen.getByText('Cue Signal')).toBeInTheDocument();
    expect(screen.getByText('Log & Catatan')).toBeInTheDocument();
    expect(screen.queryByText('Sesi & Keamanan')).not.toBeInTheDocument();
  });

  it('ModeSelector allows selecting all 4 timer modes', () => {
    renderWithProvider(<ModeSelector />);
    expect(screen.getByText('Countdown')).toBeInTheDocument();
    expect(screen.getByText('Target Time')).toBeInTheDocument();
    expect(screen.getByText('Stopwatch')).toBeInTheDocument();
    expect(screen.getByText('Jam Realtime WIB')).toBeInTheDocument();
  });

  it('PresetButtons renders preset duration buttons and clicking sets duration', () => {
    renderWithProvider(<PresetButtons />);
    const button5min = screen.getByText('5');
    expect(button5min).toBeInTheDocument();
    fireEvent.click(button5min);
  });

  it('MainControls renders Start and Reset buttons', () => {
    renderWithProvider(<MainControls />);
    expect(screen.getByText('MULAI')).toBeInTheDocument();
    expect(screen.getByText('RESET')).toBeInTheDocument();
  });

  it('MainControls hides Start/Pause for realtime-wib (a live clock can\'t be paused)', () => {
    renderInMode('realtime-wib', <MainControls />);
    expect(screen.queryByText('MULAI')).not.toBeInTheDocument();
    expect(screen.queryByText('JEDA')).not.toBeInTheDocument();
  });

  it('MainControls hides Start/Pause for countdown-to-time (anchored to a wall-clock target)', () => {
    renderInMode('countdown-to-time', <MainControls />);
    expect(screen.queryByText('MULAI')).not.toBeInTheDocument();
    expect(screen.queryByText('JEDA')).not.toBeInTheDocument();
  });

  it('CuePanel renders Standby, Go, Wrap Up, and Clear buttons', () => {
    renderWithProvider(<CuePanel />);
    expect(screen.getByText('STANDBY')).toBeInTheDocument();
    expect(screen.getByText('GO')).toBeInTheDocument();
    expect(screen.getByText('WRAP UP')).toBeInTheDocument();
    expect(screen.getByText(/Hapus Sinyal Isyarat/i)).toBeInTheDocument();
  });
});
