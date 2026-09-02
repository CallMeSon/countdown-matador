import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MasterAdminPage from '@/app/admin/page';

describe('Master Admin Hub Page (/admin)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders Master Admin Gate when locked and unlocks with default ID/password (admin / matador2026)', () => {
    render(<MasterAdminPage />);
    expect(screen.getByText('Master Admin Gate')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('admin'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'matador2026' } });
    fireEvent.click(screen.getByText('Buka Master Hub'));

    // Unlocked!
    expect(screen.getByText(/Master Admin Hub/i)).toBeInTheDocument();
    expect(screen.getByText('Panggung Utama (Main Stage)')).toBeInTheDocument();
  });

  it('renders header, live clock, and default session list when unlocked', () => {
    sessionStorage.setItem('matador_master_unlocked', 'true');
    render(<MasterAdminPage />);
    expect(screen.getByText(/Master Admin Hub/i)).toBeInTheDocument();
    expect(screen.getByText('Panggung Utama (Main Stage)')).toBeInTheDocument();
    expect(screen.getByText('Ruang Workshop & Breakout')).toBeInTheDocument();
  });

  it('opens and closes the "Buat Sesi" modal', () => {
    sessionStorage.setItem('matador_master_unlocked', 'true');
    render(<MasterAdminPage />);
    const openBtn = screen.getByText('Buat Sesi');
    fireEvent.click(openBtn);

    expect(screen.getByText('Buat Sesi Panggung Baru')).toBeInTheDocument();
    const cancelBtn = screen.getByText('Batal');
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Buat Sesi Panggung Baru')).not.toBeInTheDocument();
  });

  it('creates a new session with unique PIN and renders it in the list', () => {
    sessionStorage.setItem('matador_master_unlocked', 'true');
    render(<MasterAdminPage />);
    fireEvent.click(screen.getByText('Buat Sesi'));

    const titleInput = screen.getByPlaceholderText('Contoh: Panggung Utama (Main Stage)');
    const pinInput = screen.getByPlaceholderText('1234');

    fireEvent.change(titleInput, { target: { value: 'Hall Garuda VIP' } });
    fireEvent.change(pinInput, { target: { value: '8899' } });

    const submitBtn = screen.getByText('Simpan Sesi');
    fireEvent.click(submitBtn);

    expect(screen.getByText('Hall Garuda VIP')).toBeInTheDocument();
    expect(screen.getByText('Room ID: hall-garuda-vip')).toBeInTheDocument();
  });

  it('rejects duplicate PIN when creating session and displays error', () => {
    sessionStorage.setItem('matador_master_unlocked', 'true');
    render(<MasterAdminPage />);
    fireEvent.click(screen.getByText('Buat Sesi'));

    const titleInput = screen.getByPlaceholderText('Contoh: Panggung Utama (Main Stage)');
    const pinInput = screen.getByPlaceholderText('1234');

    fireEvent.change(titleInput, { target: { value: 'Sesi Duplikat' } });
    fireEvent.change(pinInput, { target: { value: '1234' } }); // Already used by stage-1

    const submitBtn = screen.getByText('Simpan Sesi');
    fireEvent.click(submitBtn);

    expect(screen.getByText(/PIN "1234" sudah digunakan/i)).toBeInTheDocument();
  });

  it('opens and saves Edit Session modal', () => {
    sessionStorage.setItem('matador_master_unlocked', 'true');
    render(<MasterAdminPage />);
    const editBtns = screen.getAllByTitle('Edit Sesi & PIN');
    expect(editBtns.length).toBeGreaterThan(0);

    fireEvent.click(editBtns[0]);
    expect(screen.getByText('Edit Sesi Acara')).toBeInTheDocument();

    const saveBtn = screen.getByText('Simpan Perubahan');
    fireEvent.click(saveBtn);
    expect(screen.queryByText('Edit Sesi Acara')).not.toBeInTheDocument();
  });

  it('toggles PIN visibility on session card', () => {
    sessionStorage.setItem('matador_master_unlocked', 'true');
    render(<MasterAdminPage />);
    const toggleBtns = screen.getAllByTitle('Tampilkan PIN');
    expect(toggleBtns.length).toBeGreaterThan(0);

    // Initial is masked
    expect(screen.getAllByText('••••').length).toBeGreaterThan(0);

    // Click reveal
    fireEvent.click(toggleBtns[0]);
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('opens QR code modal with download button for a session', () => {
    sessionStorage.setItem('matador_master_unlocked', 'true');
    render(<MasterAdminPage />);
    const qrButtons = screen.getAllByText('QR Code');
    fireEvent.click(qrButtons[0]);

    expect(screen.getByText('QR Code Layar Panggung')).toBeInTheDocument();
    expect(screen.getByText('Unduh Gambar QR (PNG)')).toBeInTheDocument();
    expect(screen.getByText('Tutup')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Tutup'));
    expect(screen.queryByText('QR Code Layar Panggung')).not.toBeInTheDocument();
  });
});
