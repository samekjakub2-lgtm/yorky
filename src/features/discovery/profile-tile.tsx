import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDistanceBucket } from '@/features/discovery/distance';

type ProfileTileProps = {
  displayName: string;
  age: number;
  distanceBucketKm: number | null;
  liked: boolean;
  likeLoading: boolean;
  onToggleLike: () => void;
};

// TODO: fotka cez getSignedPhotoUrls (privátny bucket).
export function ProfileTile({
  displayName,
  age,
  distanceBucketKm,
  liked,
  likeLoading,
  onToggleLike,
}: ProfileTileProps) {
  const { t } = useTranslation('discovery');
  const likeLabel = liked ? t('liked') : t('like');
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <ThemedText type="smallBold" numberOfLines={1}>
        {displayName}, {age}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatDistanceBucket(t, distanceBucketKm)}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={likeLabel}
        accessibilityState={{ selected: liked, busy: likeLoading }}
        onPress={onToggleLike}
        disabled={likeLoading}
        hitSlop={Spacing.two}
        style={({ pressed }) => [styles.like, { opacity: pressed ? 0.6 : 1 }]}>
        {likeLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <ThemedText type="smallBold" themeColor={liked ? 'text' : 'textSecondary'}>
            {likeLabel}
          </ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 3 / 4,
    margin: Spacing.one,
    borderRadius: Spacing.three,
    padding: Spacing.two,
    justifyContent: 'flex-end',
  },
  like: { marginTop: Spacing.one, alignSelf: 'flex-start' },
});
