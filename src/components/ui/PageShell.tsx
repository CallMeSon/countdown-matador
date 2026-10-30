import type { ReactNode } from 'react';

// Padding kiri-kanan dan lebar maksimum dipakai bersama semua halaman app
// (gate, control, layar) supaya tepi konten selalu sejajar.
export function PageShell({
  children,
  className = '',
  contentClassName = '',
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <main className={`min-h-screen bg-page font-ui text-fg ${className}`}>
      <div
        className={`mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 ${contentClassName}`}
      >
        {children}
      </div>
    </main>
  );
}
