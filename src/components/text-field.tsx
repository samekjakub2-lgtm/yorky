import { type InputHTMLAttributes, useId } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function TextField({ label, error, className = '', ...rest }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-muted text-sm">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`bg-surface placeholder:text-muted min-h-12 rounded-2xl px-4 text-base outline-none focus:ring-2 focus:ring-[var(--accent)] ${className}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
