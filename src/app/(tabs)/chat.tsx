import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useConversations } from '@/features/chat/api';

export default function ChatListScreen() {
  const { t } = useTranslation('chat');
  const conversations = useConversations();

  return (
    <Screen>
      <ThemedText type="subtitle">{t('title')}</ThemedText>
      {conversations.isPending ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={conversations.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<ThemedText themeColor="textSecondary">{t('empty')}</ThemedText>}
          // TODO: riadok konverzácie (meno/fotka cez get_profile) + obrazovka chatu
          renderItem={() => null}
        />
      )}
    </Screen>
  );
}
