'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useState, useTransition } from 'react';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { createMyProfile } from '@/features/profile/actions';
import { CreateProfileSchema, isAdult, latestAdultBirthDate } from '@/features/profile/schemas';
import type { ActionError } from '@/lib/action-result';

type FormError = 'name' | 'tooYoung' | 'birthDate' | ActionError;

export function OnboardingView() {
  const t = useTranslations('onboarding');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<FormError | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = CreateProfileSchema.safeParse({ display_name: name, birth_date: birthDate });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      if (field === 'display_name') setError('name');
      else setError(birthDate && !isAdult(birthDate) ? 'tooYoung' : 'birthDate');
      return;
    }
    setError(null);
    startTransition(async () => {
      // Pri úspechu Server Action presmeruje na /profile.
      const result = await createMyProfile(parsed.data);
      if (!result.ok) setError(result.error === 'invalid_input' ? 'tooYoung' : result.error);
    });
  };

  const formError =
    error === 'rate_limited'
      ? tCommon('errors.rateLimited')
      : error && !['name', 'tooYoung', 'birthDate'].includes(error)
        ? tCommon('errors.generic')
        : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label={t('nameLabel')}
        name="display_name"
        autoComplete="nickname"
        maxLength={30}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error === 'name' ? t('errors.name') : undefined}
      />
      <p className="text-muted -mt-2 text-xs">{t('nameHint')}</p>
      <TextField
        label={t('birthDateLabel')}
        name="birth_date"
        type="date"
        min="1900-01-01"
        max={latestAdultBirthDate()}
        required
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        error={
          error === 'tooYoung'
            ? t('errors.tooYoung')
            : error === 'birthDate'
              ? t('errors.birthDate')
              : undefined
        }
      />
      <p className="text-muted -mt-2 text-xs">{t('birthDateHint')}</p>
      <Button type="submit" loading={pending}>
        {t('submit')}
      </Button>
      {formError ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
