'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const ITEMS = [
  { href: '/discover', key: 'discovery', icon: '◎' },
  { href: '/likes', key: 'likes', icon: '♥' },
  { href: '/chat', key: 'chat', icon: '✉' },
  { href: '/profile', key: 'profile', icon: '☺' },
] as const;

/** Spodná navigácia – ovládanie palcom, rešpektuje safe-area (CLAUDE.md, pravidlo 5). */
export function BottomNav() {
  const t = useTranslations('common.tabs');
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('label')}
      className="bg-background/95 fixed inset-x-0 bottom-0 z-10 border-t border-black/5 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10">
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? 'text-accent font-semibold' : 'text-muted'
                }`}>
                <span aria-hidden className="text-lg leading-none">
                  {item.icon}
                </span>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
