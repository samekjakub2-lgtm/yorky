'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/components/avatar';
import { PageHeader } from '@/components/page-header';
import { useConversations } from '@/features/chat/api';
import { useMessageTime } from '@/features/chat/use-message-time';

export function ChatListView() {
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');
  const conversations = useConversations();
  const formatTime = useMessageTime();

  const renderBody = () => {
    if (conversations.isPending) return <p className="text-muted">{tCommon('loading')}</p>;
    if (conversations.isError) {
      return (
        <div className="flex flex-col items-start gap-2">
          <p className="text-muted">{t('errors.loadFailed')}</p>
          <button
            type="button"
            onClick={() => void conversations.refetch()}
            className="bg-surface min-h-11 rounded-xl px-4 text-sm font-semibold">
            {tCommon('retry')}
          </button>
        </div>
      );
    }
    if (conversations.data.length === 0) return <p className="text-muted">{t('empty')}</p>;

    return (
      <ul className="-mx-4 flex flex-col">
        {conversations.data.map((c) => {
          const preview = c.last_message_body
            ? c.last_message_from_me
              ? t('you', { body: c.last_message_body })
              : c.last_message_body
            : t('noMessages');
          const hasUnread = c.unread_count > 0;
          return (
            <li key={c.conversation_id}>
              <Link
                href={`/chat/${c.conversation_id}`}
                className="active:bg-surface flex min-h-16 items-center gap-3 px-4 py-2">
                <Avatar name={c.display_name} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{c.display_name}</span>
                    {c.last_message_at ? (
                      <span className="text-muted shrink-0 text-xs">
                        {formatTime(c.last_message_at)}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-sm ${hasUnread ? 'font-semibold' : 'text-muted'}`}>
                      {preview}
                    </span>
                    {hasUnread ? (
                      <span className="bg-accent flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white">
                        <span aria-hidden>{c.unread_count}</span>
                        <span className="sr-only">{t('unread', { count: c.unread_count })}</span>
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <PageHeader title={t('title')} />
      {renderBody()}
    </>
  );
}
