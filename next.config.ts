import { withSerwist } from '@serwist/turbopack';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Bezpečnostné hlavičky (CLAUDE.md – Ďalšie pravidlá súkromia a bezpečnosti).
const securityHeaders = [
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(self), camera=(), microphone=(), payment=(self), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  // Aplikácia je takmer celá personalizovaná (session v cookies), preto Cache Components
  // zatiaľ nepoužívame – každé čítanie cookies by muselo byť v <Suspense>.
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withSerwist(withNextIntl(nextConfig));
