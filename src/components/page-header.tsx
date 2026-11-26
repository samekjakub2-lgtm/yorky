import type { ReactNode } from 'react';

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4 pt-4 pb-2">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </header>
  );
}
