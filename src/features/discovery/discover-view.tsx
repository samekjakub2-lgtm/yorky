'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { PageHeader } from '@/components/page-header';
import { useNearbyProfiles, useSyncLocation } from '@/features/discovery/api';
import { ProfileTile } from '@/features/discovery/profile-tile';

type Permission = 'unknown' | 'prompt' | 'granted' | 'denied';

export function DiscoverView() {
  const t = useTranslations('discovery');
  const [permission, setPermission] = useState<Permission>('unknown');
  const syncLocation = useSyncLocation();
  const nearby = useNearbyProfiles(permission === 'granted' && syncLocation.isSuccess);

  // Ak už je poloha povolená, rovno ju zosynchronizuj (bez ďalšej otázky).
  useEffect(() => {
    const state: Promise<PermissionState> =
      'permissions' in navigator
        ? navigator.permissions.query({ name: 'geolocation' }).then((status) => status.state)
        : Promise.resolve('prompt');
    void state.then((value) => setPermission(value));
  }, []);

  const { mutate: sync } = syncLocation;
  useEffect(() => {
    if (permission === 'granted') sync();
  }, [permission, sync]);

  const allowLocation = () => {
    syncLocation.mutate(undefined, {
      onSuccess: () => setPermission('granted'),
      onError: (error) => {
        if (error.message === 'denied') setPermission('denied');
      },
    });
  };

  if (permission !== 'granted') {
    return (
      <section className="flex min-h-[70dvh] flex-col justify-center gap-4">
        <h1 className="text-2xl font-bold">{t('location.permissionTitle')}</h1>
        <p className="text-muted">
          {permission === 'denied' ? t('location.denied') : t('location.permissionBody')}
        </p>
        <Button onClick={allowLocation} loading={syncLocation.isPending}>
          {t('location.allow')}
        </Button>
      </section>
    );
  }

  const people = nearby.data ?? [];

  return (
    <>
      <PageHeader title={t('title')} />
      {nearby.isPending ? (
        <p className="text-muted">{t('loading')}</p>
      ) : (
        <>
          <p className="text-muted mb-3 text-sm">{t('peopleNearby', { count: people.length })}</p>
          {people.length === 0 ? (
            <p className="text-muted">{t('empty')}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {people.map((person) => (
                <li key={person.id}>
                  <ProfileTile
                    userId={person.id}
                    displayName={person.display_name}
                    age={person.age}
                    distanceBucketKm={person.distance_bucket_km}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
