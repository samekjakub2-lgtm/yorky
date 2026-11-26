import { getTranslations } from 'next-intl/server';

import { SignInForm } from '@/features/auth/sign-in-form';

export default async function SignInPage() {
  const t = await getTranslations('auth');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-muted">{t('subtitle')}</p>
      <SignInForm />
      <p className="text-muted text-sm">{t('ageNotice')}</p>
    </main>
  );
}
