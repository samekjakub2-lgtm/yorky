import { createSerwistRoute } from '@serwist/turbopack';

// Service worker sa zostaví z src/app/sw.ts a servuje na /serwist/sw.js.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: 'src/app/sw.ts',
    useNativeEsbuild: true,
    // Precache iba statické súbory buildu – nikdy HTML stránky ani dáta.
    globPatterns: ['.next/static/**/*.{js,css,woff2}', 'public/icons/*.png'],
  },
);
