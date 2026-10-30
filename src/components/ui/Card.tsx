import type { ReactNode } from 'react';

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-line bg-card p-5 sm:p-7 ${className}`}>
      {title && <h2 className="mb-5 font-display text-[28px] font-light text-fg">{title}</h2>}
      {children}
    </section>
  );
}
