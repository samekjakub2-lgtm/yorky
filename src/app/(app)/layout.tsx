import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/bottom-nav';
import { UserIdProvider } from '@/features/auth/user-context';
import { getUserId } from '@/lib/supabase/server';

/** Chránená časť aplikácie. Používateľa overuje server (getClaims), nie klient. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const userId = await getUserId();
  if (!userId) redirect('/sign-in');

  return (
    <UserIdProvider userId={userId}>
      <main className="mx-auto min-h-dvh max-w-md px-4 pt-[env(safe-area-inset-top)] pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </UserIdProvider>
  );
}
