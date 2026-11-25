import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type PersonRowProps = {
  displayName: string;
  age: number;
  actionLabel: string;
  onAction: () => void;
  actionLoading?: boolean;
  actionVariant?: 'primary' | 'secondary' | 'danger';
};

// TODO: fotka cez getSignedPhotoUrls (privátny bucket).
export function PersonRow({
  displayName,
  age,
  actionLabel,
  onAction,
  actionLoading,
  actionVariant = 'secondary',
}: PersonRowProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {displayName}, {age}
        </ThemedText>
      </View>
      <Button
        label={actionLabel}
        onPress={onAction}
        loading={actionLoading}
        variant={actionVariant}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    marginVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  text: { flex: 1 },
});
