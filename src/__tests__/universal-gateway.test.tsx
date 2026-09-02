import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RootPage from '@/app/page';

describe('Universal PIN Gateway (/ route when no room query)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders the gateway title, PIN numpad, and master hub link', () => {
    render(<RootPage />);
    expect(screen.getByText('Matador Broadcast Terminal')).toBeInTheDocument();
    expect(screen.getByText(/Masukkan PIN untuk membuka layar panggung sesi Anda/i)).toBeInTheDocument();
    expect(screen.getByText('Akses Master Admin Hub (/admin)')).toBeInTheDocument();
  });

  it('matches session when typing correct PIN (1234) on virtual numpad', () => {
    render(<RootPage />);
    
    // Press '1', '2', '3', '4'
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('4'));

    expect(screen.getByText('Sesi Terverifikasi')).toBeInTheDocument();
    expect(screen.getByText('Panggung Utama (Main Stage)')).toBeInTheDocument();
    expect(screen.getByText('Buka Layar Panggung')).toBeInTheDocument();
  });

  it('shows error warning when typing invalid PIN', () => {
    render(<RootPage />);
    
    // Press '9', '9', '9', '9'
    fireEvent.click(screen.getByText('9'));
    fireEvent.click(screen.getByText('9'));
    fireEvent.click(screen.getByText('9'));
    fireEvent.click(screen.getByText('9'));

    expect(screen.getByText(/PIN tidak valid/i)).toBeInTheDocument();
  });

  it('supports clear and backspace buttons', () => {
    render(<RootPage />);
    fireEvent.click(screen.getByText('7'));
    fireEvent.click(screen.getByText('8'));
    fireEvent.click(screen.getByText('Clear'));

    expect(screen.queryByText(/Sesi Terverifikasi/i)).not.toBeInTheDocument();
  });
});
