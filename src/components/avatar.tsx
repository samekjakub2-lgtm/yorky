/** Neutrálny avatar s iniciálou (fotky cez podpísané URL zatiaľ nie sú hotové). */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={`bg-surface text-muted flex shrink-0 items-center justify-center rounded-full font-semibold ${
        size === 'sm' ? 'size-9 text-sm' : 'size-12 text-lg'
      }`}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
