import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useNearbyProfiles, useSyncLocation } from '@/features/discovery/api';
import { requestLocationPermission } from '@/features/discovery/location';
import { ProfileTile } from '@/features/discovery/profile-tile';

export default function DiscoveryScreen() {
  const { t } = useTranslation('discovery');
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const syncLocation = useSyncLocation();
  const nearby = useNearbyProfiles();

  const askPermission = async () => {
    const granted = await requestLocationPermission();
    setPermission(granted ? 'granted' : 'denied');
  };

  const { mutate: sync } = syncLocation;
  useEffect(() => {
    if (permission === 'granted') sync();
  }, [permission, sync]);

  if (permission !== 'granted') {
    return (
      <Screen>
        <View style={styles.center}>
          <ThemedText type="subtitle">{t('location.permissionTitle')}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {permission === 'denied' ? t('location.denied') : t('location.permissionBody')}
          </ThemedText>
          <Button label={t('location.allow')} onPress={askPermission} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="subtitle">{t('title')}</ThemedText>
      {nearby.isPending ? (
        <ActivityIndicator />
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {t('peopleNearby', { count: nearby.data?.length ?? 0 })}
          </ThemedText>
          <FlatList
            data={nearby.data ?? []}
            keyExtractor={(item) => item.id}
            numColumns={3}
            onRefresh={() => syncLocation.mutate()}
            refreshing={syncLocation.isPending}
            ListEmptyComponent={<ThemedText themeColor="textSecondary">{t('empty')}</ThemedText>}
            renderItem={({ item }) => (
              <ProfileTile
                displayName={item.display_name}
                age={item.age}
                distanceBucketKm={item.distance_bucket_km}
              />
            )}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: Spacing.three },
});
