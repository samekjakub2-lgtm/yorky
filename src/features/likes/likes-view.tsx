'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { useIncomingLikes, useMatches, useToggleLike } from '@/features/likes/api';
import { usePremium } from '@/features/premium/use-premium';

type Person = { user_id: string; display_name: string; age: number };

export function LikesView() {
  const t = useTranslations('likes');
  const tProfile = useTranslations('profile');
  const tCommon = useTranslations('common');
  const tPremium = useTranslations('premium');
  const premium = usePremium();
  const isPremium = premium.data === true;
  const matches = useMatches();
  const incoming = useIncomingLikes(isPremium);
  const like = useToggleLike();
  const [notice, setNotice] = useState<string>();

  const onToggle = async (person: Person) => {
    try {
      const matchId = await like.toggle(person.user_id);
      if (matchId) setNotice(t('matchBody', { name: person.display_name }));
    } catch {
      setNotice(t('errors.likeFailed'));
    }
  };

  const renderList = (people: Person[], empty: string, actionLabel: string) =>
    people.length === 0 ? (
      <p className="text-muted text-sm">{empty}</p>
    ) : (
      <ul className="flex flex-col gap-2">
        {people.map((person) => (
          <li key={person.user_id} className="bg-surface flex items-center gap-3 rounded-2xl p-3">
            <span className="flex-1 truncate font-medium">
              {tCommon('nameAge', {
                name: person.display_name,
                age: tProfile('age', { count: person.age }),
              })}
            </span>
            <button
              type="button"
              onClick={() => void onToggle(person)}
              disabled={like.isPending(person.user_id)}
              className="bg-background min-h-11 rounded-xl px-4 text-sm font-semibold">
              {actionLabel}
            </button>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <PageHeader title={t('title')} />
      {notice ? (
        <p role="status" className="bg-surface mb-4 rounded-2xl p-3 text-sm">
          {notice}
        </p>
      ) : null}

      <section className="mb-6 flex flex-col gap-2">
        <h2 className="font-semibold">{t('matches.title')}</h2>
        {matches.isPending
          ? null
          : renderList(matches.data ?? [], t('matches.empty'), t('actions.unmatch'))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('incoming.title')}</h2>
        {isPremium ? (
          renderList(incoming.data ?? [], t('incoming.empty'), t('actions.likeBack'))
        ) : (
          <div className="bg-surface flex flex-col gap-3 rounded-2xl p-4">
            <p className="text-muted text-sm">{t('incoming.premiumOnly')}</p>
            <Link
              href="/premium"
              className="bg-foreground text-background inline-flex min-h-12 items-center justify-center rounded-2xl px-6 text-sm font-semibold">
              {tPremium('upsell')}
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
