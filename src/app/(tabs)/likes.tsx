import { useTranslation } from 'react-i18next';
import { ActivityIndicator, SectionList, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useIncomingLikes, useMatches } from '@/features/likes/api';
import { PersonRow } from '@/features/likes/person-row';
import { useToggleLike } from '@/features/likes/use-toggle-like';
import { usePremium } from '@/features/paywall/use-premium';

type Row = { kind: 'match' | 'incoming'; userId: string; displayName: string; age: number };

export default function LikesScreen() {
  const { t } = useTranslation('likes');
  const premium = usePremium();
  const isPremium = premium.data === true;
  const matches = useMatches();
  const incoming = useIncomingLikes(isPremium);
  const toggleLike = useToggleLike();

  if (matches.isPending || premium.isPending) {
    return (
      <Screen>
        <ThemedText type="subtitle">{t('title')}</ThemedText>
        <ActivityIndicator />
      </Screen>
    );
  }

  const matchRows: Row[] = (matches.data ?? []).map((m) => ({
    kind: 'match',
    userId: m.user_id,
    displayName: m.display_name,
    age: m.age,
  }));
  const incomingRows: Row[] = (incoming.data ?? []).map((l) => ({
    kind: 'incoming',
    userId: l.user_id,
    displayName: l.display_name,
    age: l.age,
  }));

  const sections = [
    { key: 'matches', title: t('matches.title'), empty: t('matches.empty'), data: matchRows },
    {
      key: 'incoming',
      title: t('incoming.title'),
      empty: isPremium ? t('incoming.empty') : t('incoming.premiumOnly'),
      data: incomingRows,
    },
  ];

  return (
    <Screen>
      <ThemedText type="subtitle">{t('title')}</ThemedText>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.kind}:${item.userId}`}
        refreshing={matches.isRefetching || incoming.isRefetching}
        onRefresh={() => {
          void matches.refetch();
          if (isPremium) void incoming.refetch();
        }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" style={styles.header}>
            {section.title}
          </ThemedText>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {section.empty}
            </ThemedText>
          ) : null
        }
        renderItem={({ item }) =>
          item.kind === 'match' ? (
            <PersonRow
              displayName={item.displayName}
              age={item.age}
              actionLabel={t('actions.unmatch')}
              actionVariant="secondary"
              actionLoading={toggleLike.isPending(item.userId)}
              onAction={() => toggleLike.toggle(item.userId, item.displayName)}
            />
          ) : (
            <PersonRow
              displayName={item.displayName}
              age={item.age}
              actionLabel={t('actions.likeBack')}
              actionVariant="primary"
              actionLoading={toggleLike.isPending(item.userId)}
              onAction={() => toggleLike.toggle(item.userId, item.displayName)}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: Spacing.three, marginBottom: Spacing.one },
});
