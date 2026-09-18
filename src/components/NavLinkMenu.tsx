'use client';

import { useEffect, useRef, useState } from 'react';

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
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-xl font-bold tracking-widest transition-transform active:scale-95 hover:bg-zinc-800"
      >
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-max min-w-[11rem] animate-fadeIn overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg">
          <button
            onClick={() => {
              window.open(path, '_blank', 'noopener,noreferrer');
              setOpen(false);
            }}
            className="block w-full px-4 py-3 text-left text-sm font-semibold tracking-wide hover:bg-zinc-800"
          >
            Buka Tab Baru
          </button>
          <button
            onClick={handleCopy}
            className="block w-full px-4 py-3 text-left text-sm font-semibold tracking-wide hover:bg-zinc-800"
          >
            {copied ? 'Tersalin!' : 'Salin Link'}
          </button>
        </div>
      )}
    </div>
  );
}
