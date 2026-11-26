'use client';

import { useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/button';
import { savePushSubscription } from '@/features/push/actions';
import { isPushSupported, needsInstallForPush, subscribeToPush } from '@/lib/platform/push';

type State = 'loading' | 'unsupported' | 'needs-install' | 'off' | 'on' | 'error';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function readPushState(): State {
  if (needsInstallForPush()) return 'needs-install';
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return 'unsupported';
  return Notification.permission === 'granted' ? 'on' : 'off';
}

const noopSubscribe = () => () => undefined;

export function PushToggle() {
  const t = useTranslations('push');
  const initial = useSyncExternalStore(noopSubscribe, readPushState, () => 'loading' as const);
  const [override, setOverride] = useState<State>();
  const state = override ?? initial;

  const enable = async () => {
    if (!VAPID_PUBLIC_KEY) return;
    try {
      const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
      const result = await savePushSubscription(subscription);
      setOverride(result.ok ? 'on' : 'error');
    } catch {
      setOverride('error');
    }
  };

  if (state === 'loading' || state === 'unsupported') return null;
  if (state === 'needs-install') return <p className="text-muted py-3 text-sm">{t('iosHint')}</p>;

  return (
    <div className="flex flex-col gap-2 py-3">
      {state === 'on' ? (
        <p className="text-sm">{t('enabled')}</p>
      ) : (
        <Button variant="secondary" onClick={() => void enable()}>
          {t('enable')}
        </Button>
      )}
      {state === 'error' ? <p className="text-sm text-red-600">{t('error')}</p> : null}
    </div>
  );
}
