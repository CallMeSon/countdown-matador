import type { ButtonHTMLAttributes } from 'react';

type Variant = 'accent' | 'highlight' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  accent: 'bg-accent text-on-accent hover:bg-accent-hover',
  highlight: 'bg-highlight text-ink',
  ghost: 'bg-control border border-line text-fg',
  danger: 'border border-danger text-danger bg-danger/10',
};

const SIZES = { md: 'min-h-[44px] px-4', lg: 'min-h-[56px] px-6 text-lg' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: Variant;
  size?: 'md' | 'lg';
}

export function Button({ variant, size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn inline-flex items-center justify-center gap-2 rounded-control font-medium disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
