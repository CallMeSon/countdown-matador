import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Segmented } from '@/components/ui/Segmented';
import { Field } from '@/components/ui/Field';
import { Disclosure } from '@/components/ui/Disclosure';
import { AppNav } from '@/components/ui/AppNav';
import { AppFooter } from '@/components/ui/AppFooter';
import { PageShell } from '@/components/ui/PageShell';
import { Button } from '@/components/ui/Button';

const OPTS = [
  { value: 'a', label: 'Satu' },
  { value: 'b', label: 'Dua' },
  { value: 'c', label: 'Tiga' },
];

describe('Segmented', () => {
  it('memanggil onChange saat segmen diklik', () => {
    const onChange = vi.fn();
    render(<Segmented ariaLabel="Mode" value="a" options={OPTS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dua' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('ArrowRight memilih segmen berikutnya dan ArrowLeft di awal berputar ke akhir', () => {
    const onChange = vi.fn();
    render(<Segmented ariaLabel="Mode" value="a" options={OPTS} onChange={onChange} />);
    const first = screen.getByRole('radio', { name: 'Satu' });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('b');
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('c');
  });

  it('hanya segmen aktif yang aria-checked', () => {
    render(<Segmented ariaLabel="Mode" value="b" options={OPTS} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Dua' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Satu' }).getAttribute('aria-checked')).toBe('false');
  });
});

describe('Field', () => {
  it('error memberi aria-invalid dan menghubungkan pesan lewat aria-describedby', () => {
    render(<Field label="Kode room" error="Kode tidak ditemukan" />);
    const input = screen.getByLabelText('Kode room');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const id = input.getAttribute('aria-describedby');
    expect(document.getElementById(id as string)?.textContent).toBe('Kode tidak ditemukan');
  });

  it('tanpa error tidak ada aria-invalid', () => {
    render(<Field label="Kode room" hint="Huruf dan angka" />);
    expect(screen.getByLabelText('Kode room').getAttribute('aria-invalid')).toBeNull();
  });
});

describe('Disclosure', () => {
  it('aria-expanded mengikuti buka/tutup', () => {
    render(
      <Disclosure title="Pengaturan">
        <p>isi</p>
      </Disclosure>,
    );
    const btn = screen.getByRole('button', { name: /Pengaturan/ });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('isi')).toBeTruthy();
  });
});

describe('AppNav', () => {
  it('tautan Layar dan Control membawa kode room', () => {
    render(<AppNav room="AB12CD" active="control" />);
    expect(screen.getByRole('link', { name: 'Layar' }).getAttribute('href')).toBe('/layar?room=AB12CD');
    expect(screen.getByRole('link', { name: 'Control' }).getAttribute('href')).toBe('/control?room=AB12CD');
    expect(screen.getByRole('link', { name: 'Control' }).getAttribute('aria-current')).toBe('page');
  });
});

describe('Button', () => {
  it('menerusi atribut dan memicu onClick', () => {
    const onClick = vi.fn();
    render(
      <Button variant="accent" onClick={onClick}>
        START
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('AppFooter', () => {
  it('menampilkan Powered by DigiOH dan hak cipta tahun berjalan', () => {
    render(<AppFooter />);
    const link = screen.getByRole('link', { name: 'Powered by DigiOH' });
    expect(link.getAttribute('href')).toBe('https://digioh.id');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByText(`© ${new Date().getFullYear()} DigiOH. Seluruh hak cipta dilindungi.`)).toBeTruthy();
  });

  it('PageShell memasang footer di bawah konten', () => {
    render(<PageShell><p>isi</p></PageShell>);
    expect(screen.getByText('isi')).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
  });
});

describe('AppNav brand', () => {
  it('menampilkan logo DigiOH sebagai merek', () => {
    render(<AppNav room="AB12CD" active="control" />);
    const logo = screen.getByAltText('DigiOH Timer');
    expect(logo.getAttribute('src')).toBe('/brand/digioh-logo-white.svg');
  });
});
