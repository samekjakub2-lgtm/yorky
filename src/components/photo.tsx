/**
 * Fotka z privátneho bucketu cez podpísané URL. Zámerne obyčajný <img>, nie next/image –
 * optimalizátor Next.js by podpísané URL fotiek cachoval na serveri.
 */
export function Photo({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`size-full object-cover ${className}`}
    />
  );
}
