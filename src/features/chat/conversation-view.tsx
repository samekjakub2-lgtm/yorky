'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { Avatar } from '@/components/avatar';
import { useUserId } from '@/features/auth/user-context';
import {
  useConversation,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from '@/features/chat/api';
import { useMessageTime } from '@/features/chat/use-message-time';

const MAX_LENGTH = 2000;

export function ConversationView({ conversationId }: { conversationId: string }) {
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');
  const userId = useUserId();
  const conversation = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkConversationRead(conversationId);
  const formatTime = useMessageTime();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const list = messages.data ?? [];
  const hasUnread = list.some((m) => m.sender_id !== userId && !m.read_at);
  const lastMessageId = list.at(-1)?.id;
  const { mutate: markAsRead } = markRead;

  // Pri otvorení a pri novej prijatej správe označ konverzáciu ako prečítanú.
  useEffect(() => {
    if (hasUnread) markAsRead();
  }, [hasUnread, lastMessageId, markAsRead]);

  // Po načítaní a pri novej správe posuň na koniec.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lastMessageId]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || send.isPending) return;
    send.mutate(body, { onSuccess: () => setDraft('') });
  };

  if (conversation.isSuccess && conversation.data === null) {
    return (
      <div className="flex flex-col gap-4 pt-4">
        <p className="text-muted">{t('notFound')}</p>
        <Link href="/chat" className="text-accent min-h-11 font-semibold">
          {t('back')}
        </Link>
      </div>
    );
  }

  // Index mojej poslednej prečítanej správy – „Prečítané“ zobrazíme iba pod ňou.
  const lastReadOwnIndex = list.findLastIndex((m) => m.sender_id === userId && m.read_at);

  return (
    <div className="flex min-h-[calc(100dvh-4.5rem-env(safe-area-inset-bottom)-env(safe-area-inset-top))] flex-col">
      <header className="bg-background/95 sticky top-0 z-10 -mx-4 -mt-[env(safe-area-inset-top)] flex items-center gap-2 px-2 pt-[env(safe-area-inset-top)] pb-2 backdrop-blur">
        <Link
          href="/chat"
          aria-label={t('back')}
          className="flex size-11 shrink-0 items-center justify-center text-2xl">
          <span aria-hidden>‹</span>
        </Link>
        {conversation.data ? (
          <>
            <Avatar name={conversation.data.display_name} size="sm" />
            <h1 className="truncate text-lg font-semibold">{conversation.data.display_name}</h1>
          </>
        ) : null}
      </header>

      <section aria-live="polite" className="flex flex-1 flex-col gap-1 py-2">
        {messages.isPending ? (
          <p className="text-muted m-auto">{tCommon('loading')}</p>
        ) : messages.isError ? (
          <div className="m-auto flex flex-col items-center gap-2">
            <p className="text-muted">{t('errors.loadFailed')}</p>
            <button
              type="button"
              onClick={() => void messages.refetch()}
              className="bg-surface min-h-11 rounded-xl px-4 text-sm font-semibold">
              {tCommon('retry')}
            </button>
          </div>
        ) : list.length === 0 ? (
          <p className="text-muted m-auto text-center">{t('noMessages')}</p>
        ) : (
          list.map((m, index) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <p
                  className={`max-w-[80%] rounded-2xl px-3 py-2 break-words whitespace-pre-wrap ${
                    mine ? 'bg-accent text-white' : 'bg-surface'
                  }`}>
                  {m.body}
                </p>
                <span className="text-muted px-1 text-[11px]">
                  {formatTime(m.created_at)}
                  {index === lastReadOwnIndex ? ` · ${t('read')}` : null}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={onSubmit}
        className="bg-background sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-1 px-4 py-2">
        {send.isError ? (
          <p role="alert" className="text-sm text-red-600">
            {t('errors.sendFailed')}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="chat-message">
            {t('messageLabel')}
          </label>
          <textarea
            id="chat-message"
            rows={1}
            value={draft}
            maxLength={MAX_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('inputPlaceholder')}
            enterKeyHint="send"
            className="bg-surface placeholder:text-muted max-h-32 min-h-11 flex-1 resize-none rounded-2xl px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || send.isPending || !conversation.data}
            aria-busy={send.isPending}
            className="bg-foreground text-background min-h-11 rounded-2xl px-4 text-sm font-semibold disabled:opacity-50">
            {t('send')}
          </button>
        </div>
      </form>
    </div>
  );
}
