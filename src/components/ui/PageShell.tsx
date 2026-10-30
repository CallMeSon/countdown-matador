import type { ReactNode } from 'react';
import { AppFooter } from './AppFooter';

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
    <main className={`flex min-h-screen flex-col bg-page font-ui text-fg ${className}`}>
      <div
        className={`mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-10 ${contentClassName}`}
      >
        {children}
      </div>
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-8 sm:px-6 lg:px-10">
        <AppFooter />
      </div>
    </main>
  );
}
