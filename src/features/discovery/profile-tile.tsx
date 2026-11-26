'use client';

import { useTranslations } from 'next-intl';

import { formatDistanceBucket } from '@/features/discovery/distance';
import { useToggleLike } from '@/features/likes/api';

const HEART = { on: '♥', off: '♡' } as const;

type ProfileTileProps = {
  userId: string;
  displayName: string;
  age: number;
  distanceBucketKm: number | null;
};

// TODO: fotka cez getSignedPhotoUrls (privátny bucket, krátka platnosť).
export function ProfileTile({ userId, displayName, age, distanceBucketKm }: ProfileTileProps) {
  const t = useTranslations('discovery');
  const tCommon = useTranslations('common');
  const like = useToggleLike();
  const liked = like.isLiked(userId);

  return (
    <article className="bg-surface relative flex aspect-[3/4] flex-col justify-end rounded-2xl p-2">
      <button
        type="button"
        onClick={() => void like.toggle(userId).catch(() => undefined)}
        disabled={like.isPending(userId)}
        aria-pressed={liked}
        aria-label={liked ? t('liked') : t('like')}
        className={`absolute top-1 right-1 flex size-11 items-center justify-center rounded-full text-lg ${
          liked ? 'text-accent' : 'text-muted'
        }`}>
        <span aria-hidden>{liked ? HEART.on : HEART.off}</span>
      </button>
      <p className="truncate text-sm font-semibold">
        {tCommon('nameAge', { name: displayName, age })}
      </p>
      <p className="text-muted text-xs">{formatDistanceBucket(t, distanceBucketKm)}</p>
    </article>
  );
}
