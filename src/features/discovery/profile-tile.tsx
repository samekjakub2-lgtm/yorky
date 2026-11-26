'use client';

import { useTranslations } from 'next-intl';

import { Photo } from '@/components/photo';
import { formatDistanceBucket } from '@/features/discovery/distance';
import { useToggleLike } from '@/features/likes/api';

const HEART = { on: '♥', off: '♡' } as const;

type ProfileTileProps = {
  userId: string;
  displayName: string;
  age: number;
  distanceBucketKm: number | null;
  /** Podpísané URL hlavnej fotky (krátka platnosť); bez fotky sa zobrazí prázdna dlaždica. */
  photoUrl?: string;
};

export function ProfileTile({
  userId,
  displayName,
  age,
  distanceBucketKm,
  photoUrl,
}: ProfileTileProps) {
  const t = useTranslations('discovery');
  const tCommon = useTranslations('common');
  const like = useToggleLike();
  const liked = like.isLiked(userId);

  return (
    <article className="bg-surface relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl p-2">
      {photoUrl ? (
        <>
          <div className="absolute inset-0">
            <Photo src={photoUrl} alt={t('photoAlt', { name: displayName })} />
          </div>
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/70 to-transparent"
          />
        </>
      ) : null}
      <button
        type="button"
        onClick={() => void like.toggle(userId).catch(() => undefined)}
        disabled={like.isPending(userId)}
        aria-pressed={liked}
        aria-label={liked ? t('liked') : t('like')}
        className={`absolute top-1 right-1 z-10 flex size-11 items-center justify-center rounded-full text-lg ${
          liked ? 'text-accent' : photoUrl ? 'text-white' : 'text-muted'
        } ${photoUrl ? 'bg-black/30' : ''}`}>
        <span aria-hidden>{liked ? HEART.on : HEART.off}</span>
      </button>
      <p className={`relative truncate text-sm font-semibold ${photoUrl ? 'text-white' : ''}`}>
        {tCommon('nameAge', { name: displayName, age })}
      </p>
      <p className={`relative text-xs ${photoUrl ? 'text-white/80' : 'text-muted'}`}>
        {formatDistanceBucket(t, distanceBucketKm)}
      </p>
    </article>
  );
}
