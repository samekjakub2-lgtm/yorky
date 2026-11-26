'use client';

import { SerwistProvider } from '@serwist/turbopack/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );

  return (
    // cacheOnNavigation=false: service worker NESMIE cachovať stránky s osobnými údajmi.
    <SerwistProvider
      swUrl="/serwist/sw.js"
      cacheOnNavigation={false}
      disable={process.env.NODE_ENV !== 'production'}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SerwistProvider>
  );
}
