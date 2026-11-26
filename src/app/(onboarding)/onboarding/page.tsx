import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/button';
import { signOut } from '@/features/auth/actions';
import { OnboardingView } from '@/features/profile/onboarding-view';
import { hasMyProfile } from '@/features/profile/queries';
import { getUserId } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('onboarding');
  return { title: t('title') };
}

/** Prvé prihlásenie: vytvorenie profilu. Kto už profil má, ide rovno do aplikácie. */
export default async function OnboardingPage() {
  if (!(await getUserId())) redirect('/sign-in');
  if (await hasMyProfile()) redirect('/discover');

  const t = await getTranslations('onboarding');
  const tProfile = await getTranslations('profile');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-muted">{t('subtitle')}</p>
      <OnboardingView />
      <form action={signOut}>
        <Button type="submit" variant="secondary">
          {tProfile('signOut')}
        </Button>
      </form>
    </main>
  );
}
