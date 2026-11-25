import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';

import { useAuthListener } from '@/features/auth/use-auth-listener';
import { i18n } from '@/lib/i18n';
import { queryClient } from '@/lib/query-client';

function AuthListener() {
  useAuthListener();
  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AuthListener />
        {children}
      </QueryClientProvider>
    </I18nextProvider>
  );
}
