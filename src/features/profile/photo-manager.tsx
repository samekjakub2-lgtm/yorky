'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useRef, useState } from 'react';

import { Photo } from '@/components/photo';
import { useUserId } from '@/features/auth/user-context';
import {
  useDeletePhoto,
  useMyPhotos,
  useSignedPhotoUrls,
  useUploadPhoto,
} from '@/features/profile/api';
import { MAX_PHOTOS } from '@/features/profile/schemas';

/** Max. veľkosť vybraného súboru pred prekódovaním (výsledok má max. 1600 px a pár stoviek kB). */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

const ICONS = { add: '+', remove: '×' } as const;

type UploadError = 'tooLarge' | 'notImage' | 'failed';

export function PhotoManager() {
  const t = useTranslations('profile.photos');
  const userId = useUserId();
  const inputRef = useRef<HTMLInputElement>(null);
  const photos = useMyPhotos();
  const list = photos.data ?? [];
  const urls = useSignedPhotoUrls(list.map((p) => p.storage_path));
  const upload = useUploadPhoto(userId);
  const remove = useDeletePhoto();
  const [error, setError] = useState<UploadError | null>(null);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // rovnaký súbor sa dá vybrať znova
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('notImage');
    if (file.size > MAX_INPUT_BYTES) return setError('tooLarge');
    setError(null);
    upload.mutate(file, { onError: () => setError('failed') });
  };

  const canAdd = photos.isSuccess && list.length < MAX_PHOTOS && !upload.isPending;

  return (
    <section aria-labelledby="photos-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="photos-title" className="text-lg font-semibold">
          {t('title')}
        </h2>
        <span className="text-muted text-sm">
          {t('count', { count: list.length, max: MAX_PHOTOS })}
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {list.map((photo, index) => {
          const url = urls.data?.get(photo.storage_path);
          return (
            <li
              key={photo.id}
              className="bg-surface relative aspect-[3/4] overflow-hidden rounded-2xl">
              {url ? <Photo src={url} alt={t('alt', { index: index + 1 })} /> : null}
              {index === 0 ? (
                <span className="bg-foreground text-background absolute bottom-1 left-1 rounded-full px-2 py-0.5 text-xs">
                  {t('primary')}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => remove.mutate(photo.id, { onError: () => setError('failed') })}
                disabled={remove.isPending}
                aria-label={t('delete', { index: index + 1 })}
                className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full bg-black/50 text-lg text-white disabled:opacity-50">
                <span aria-hidden>{ICONS.remove}</span>
              </button>
            </li>
          );
        })}
        {canAdd || upload.isPending ? (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={!canAdd}
              aria-busy={upload.isPending}
              className="bg-surface text-muted flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-current/30 text-sm disabled:opacity-50">
              {upload.isPending ? (
                <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <span aria-hidden className="text-2xl leading-none">
                    {ICONS.add}
                  </span>
                  {t('add')}
                </>
              )}
            </button>
          </li>
        ) : null}
      </ul>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <p className="text-muted text-xs">{t('privacyHint')}</p>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </section>
  );
}
