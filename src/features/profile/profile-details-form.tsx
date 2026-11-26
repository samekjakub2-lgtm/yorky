'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { updateMyProfile } from '@/features/profile/actions';
import { profileKeys } from '@/features/profile/api';
import { ProfileDetailsSchema } from '@/features/profile/schemas';

const BIO_MAX = 500;

type Initial = { display_name: string; bio: string | null; height_cm: number | null };
type Status = 'idle' | 'saved' | 'invalid' | 'failed';

export function ProfileDetailsForm({ initial }: { initial: Initial }) {
  const t = useTranslations('profile.details');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const bioId = useId();
  const [name, setName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio ?? '');
  const [height, setHeight] = useState(initial.height_cm?.toString() ?? '');
  const [status, setStatus] = useState<Status>('idle');
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = ProfileDetailsSchema.safeParse({
      display_name: name,
      bio,
      height_cm: height.trim() === '' ? null : Number(height),
    });
    if (!parsed.success) {
      setStatus('invalid');
      return;
    }
    startTransition(async () => {
      const result = await updateMyProfile(parsed.data);
      setStatus(result.ok ? 'saved' : result.error === 'invalid_input' ? 'invalid' : 'failed');
      if (result.ok) await queryClient.invalidateQueries({ queryKey: profileKeys.mine });
    });
  };

  const change =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setStatus('idle');
    };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label={t('nameLabel')}
        autoComplete="nickname"
        maxLength={30}
        value={name}
        onChange={(e) => change(setName)(e.target.value)}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={bioId} className="text-muted text-sm">
          {t('bioLabel')}
        </label>
        <textarea
          id={bioId}
          rows={4}
          maxLength={BIO_MAX}
          placeholder={t('bioPlaceholder')}
          value={bio}
          onChange={(e) => change(setBio)(e.target.value)}
          className="bg-surface placeholder:text-muted rounded-2xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <p className="text-muted self-end text-xs">
          {t('bioCounter', { count: bio.length, max: BIO_MAX })}
        </p>
      </div>
      <TextField
        label={t('heightLabel')}
        type="number"
        inputMode="numeric"
        min={120}
        max={230}
        placeholder={t('heightPlaceholder')}
        value={height}
        onChange={(e) => change(setHeight)(e.target.value)}
      />
      <Button type="submit" loading={pending}>
        {tCommon('save')}
      </Button>
      <p role="status" className="min-h-5 text-sm">
        {status === 'saved' ? <span className="text-muted">{t('saved')}</span> : null}
        {status === 'invalid' ? <span className="text-red-600">{t('invalid')}</span> : null}
        {status === 'failed' ? (
          <span className="text-red-600">{tCommon('errors.generic')}</span>
        ) : null}
      </p>
    </form>
  );
}
