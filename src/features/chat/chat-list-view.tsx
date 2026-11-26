'use client';

import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/page-header';
import { useConversations } from '@/features/chat/api';

export function ChatListView() {
  const t = useTranslations('chat');
  const conversations = useConversations();

  return (
    <>
      <PageHeader title={t('title')} />
      {conversations.isPending ? null : (conversations.data ?? []).length === 0 ? (
        <p className="text-muted">{t('empty')}</p>
      ) : (
        // TODO: riadok konverzácie (meno/fotka cez get_profile) + stránka chat/[id]
        <ul className="flex flex-col gap-2" />
      )}
    </>
  );
}
