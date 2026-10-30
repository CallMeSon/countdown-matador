'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';

export function NavLinkMenu({
  label,
  path,
  className,
}: {
  label: string;
  path: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { mounted } = usePresence(open, 100);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      // clipboard API unavailable (non-secure context) — no-op, menu stays open
    }
  };

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn min-h-[44px] w-full rounded-control border border-line bg-control px-4 py-2 font-medium text-fg hover:bg-fg/5"
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          {label}
          <ArrowUpRight aria-hidden="true" size={16} />
        </span>
      </button>
      {mounted && (
        <div className={`absolute left-0 top-full z-20 mt-2 w-max min-w-full max-w-[80vw] ${open ? 'm-menu-in' : 'm-menu-out'} overflow-hidden rounded-control border border-line bg-card text-fg shadow-lg`}>
          <button
            onClick={() => {
              window.open(path, '_blank', 'noopener,noreferrer');
              setOpen(false);
            }}
            className="block w-full px-4 py-3 text-left text-sm font-semibold tracking-wide hover:bg-fg/5"
          >
            Buka Tab Baru
          </button>
          <button
            onClick={handleCopy}
            className="block w-full px-4 py-3 text-left text-sm font-semibold tracking-wide hover:bg-fg/5"
          >
            {copied ? 'Tersalin!' : 'Salin Link'}
          </button>
        </div>
      )}
    </div>
  );
}
