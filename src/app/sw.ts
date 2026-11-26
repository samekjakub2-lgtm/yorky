/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, Serwist } from 'serwist';

import cs from '../../messages/cs.json';
import sk from '../../messages/sk.json';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// CLAUDE.md: service worker cachuje IBA statické súbory aplikácie – nikdy odpovede API,
// stránky s osobnými údajmi ani podpísané URL fotiek. Všetko ostatné ide priamo na sieť.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin &&
        (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')),
      handler: new CacheFirst({
        cacheName: 'static-assets',
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
  ],
});

serwist.addEventListeners();

// -----------------------------------------------------------------------------
// Web Push – payload obsahuje IBA typ udalosti (CLAUDE.md, pravidlo 6).
// Text skladáme tu z prekladov; nikdy neobsahuje text správy, meno ani fotku.
// -----------------------------------------------------------------------------

type PushType = 'message' | 'match';

const TARGETS: Record<PushType, string> = { message: '/chat', match: '/likes' };

function parsePushType(data: PushMessageData | null): PushType {
  try {
    const type: unknown = data?.json()?.type;
    return type === 'match' ? 'match' : 'message';
  } catch {
    return 'message';
  }
}

function pushTexts(type: PushType) {
  const push = self.navigator.language.toLowerCase().startsWith('cs') ? cs.push : sk.push;
  return type === 'match'
    ? { title: push.newMatchTitle, body: push.newMatchBody }
    : { title: push.newMessageTitle, body: push.newMessageBody };
}

self.addEventListener('push', (event) => {
  const type = parsePushType(event.data);
  const { title, body } = pushTexts(type);
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: type, // nové upozornenie nahradí staré, nehromadia sa
      data: { url: TARGETS[type] },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url: unknown = event.notification.data?.url;
  const target = typeof url === 'string' && url.startsWith('/') ? url : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        void existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
