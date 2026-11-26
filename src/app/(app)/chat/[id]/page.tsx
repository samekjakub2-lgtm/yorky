import { notFound } from 'next/navigation';

import { ConversationView } from '@/features/chat/conversation-view';
import { UuidSchema } from '@/lib/action-result';

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = UuidSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  return <ConversationView conversationId={parsed.data} />;
}
