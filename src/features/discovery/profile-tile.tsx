import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDistanceBucket } from '@/features/discovery/distance';

type ProfileTileProps = {
  displayName: string;
  age: number;
  distanceBucketKm: number | null;
};

// TODO: fotka cez getSignedPhotoUrls (privátny bucket).
export function ProfileTile({ displayName, age, distanceBucketKm }: ProfileTileProps) {
  const { t } = useTranslation('discovery');
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <ThemedText type="smallBold" numberOfLines={1}>
        {displayName}, {age}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatDistanceBucket(t, distanceBucketKm)}
      </ThemedText>
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
});
