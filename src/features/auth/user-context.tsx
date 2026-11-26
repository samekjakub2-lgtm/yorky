'use client';

import { createContext, type ReactNode, useContext } from 'react';

const UserIdContext = createContext<string | null>(null);

/** ID prihláseného používateľa – overené na serveri v (app)/layout.tsx. */
export function UserIdProvider({ userId, children }: { userId: string; children: ReactNode }) {
  return <UserIdContext.Provider value={userId}>{children}</UserIdContext.Provider>;
}

export function useUserId(): string {
  const userId = useContext(UserIdContext);
  if (!userId) throw new Error('useUserId must be used inside UserIdProvider');
  return userId;
}
