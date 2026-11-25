import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { env } from '@/lib/env';

/** Identifikátor entitlementu v RevenueCat dashboarde. Prístup kontroluj IBA cez neho. */
export const PREMIUM_ENTITLEMENT = 'premium';

let configured = false;

/** App User ID v RevenueCat = Supabase user id (webhook podľa neho páruje nákupy). */
export function configureRevenueCat(userId: string): void {
  const apiKey =
    Platform.OS === 'ios'
      ? env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey || Platform.OS === 'web') return;

  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
  } else {
    void Purchases.logIn(userId);
  }
}

export async function resetRevenueCat(): Promise<void> {
  if (configured) await Purchases.logOut().catch(() => undefined);
}
