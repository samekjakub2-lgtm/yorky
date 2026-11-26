import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
};

const VARIANTS = {
  primary: 'bg-foreground text-background',
  secondary: 'bg-surface text-foreground',
  danger: 'bg-red-600 text-white',
} as const;

/** Tlačidlo s dotykovým cieľom min. 44 px (CLAUDE.md, pravidlo 5). */
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold transition-opacity active:opacity-80 disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}>
      {loading ? (
        <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
