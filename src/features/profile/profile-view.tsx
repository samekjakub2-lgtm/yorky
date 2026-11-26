'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/button';
import { PageHeader } from '@/components/page-header';
import { signOut } from '@/features/auth/actions';
import { usePremium } from '@/features/premium/use-premium';
import { deleteMyAccount, updateMyProfile } from '@/features/profile/actions';
import { profileKeys, useMyProfile } from '@/features/profile/api';
import { PushToggle } from '@/features/push/push-toggle';

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-4">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        className="accent-accent size-6"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function ProfileView() {
  const t = useTranslations('profile');
  const queryClient = useQueryClient();
  const profile = useMyProfile();
  const premium = usePremium();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const onDelete = () =>
    startTransition(async () => {
      const result = await deleteMyAccount();
      if (!result.ok) setDeleteFailed(true);
    });

  const update = (patch: { hide_distance?: boolean; is_incognito?: boolean }) =>
    startTransition(async () => {
      await updateMyProfile(patch);
      await queryClient.invalidateQueries({ queryKey: profileKeys.mine });
    });

  return (
    <>
      <PageHeader title={t('title')} />
      {profile.data ? (
        <section className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          <p className="pb-3 text-lg font-semibold">{profile.data.display_name}</p>
          <Toggle
            label={t('hideDistance')}
            checked={profile.data.hide_distance}
            disabled={pending}
            onChange={(hide_distance) => update({ hide_distance })}
          />
          <Toggle
            label={t('incognito')}
            checked={profile.data.is_incognito}
            disabled={pending || premium.data !== true}
            onChange={(is_incognito) => update({ is_incognito })}
          />
          {premium.data !== true ? (
            <p className="text-muted py-2 text-sm">{t('premiumRequired')}</p>
          ) : null}
          <PushToggle />
        </section>
      ) : null}

      <section className="mt-8 flex flex-col gap-3">
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            {t('signOut')}
          </Button>
        </form>
        {confirmDelete ? (
          <div
            role="alertdialog"
            aria-labelledby="delete-confirm"
            className="bg-surface flex flex-col gap-3 rounded-2xl p-4">
            <p id="delete-confirm">{t('deleteAccountConfirm')}</p>
            <Button variant="danger" onClick={onDelete} loading={pending}>
              {t('deleteAccount')}
            </Button>
            {deleteFailed ? (
              <p role="alert" className="text-sm text-red-600">
                {t('deleteFailed')}
              </p>
            ) : null}
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              {t('cancel')}
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            {t('deleteAccount')}
          </Button>
        )}
      </section>
    </>
  );
}
