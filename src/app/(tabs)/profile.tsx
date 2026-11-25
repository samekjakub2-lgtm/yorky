import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/api';
import { usePremium } from '@/features/paywall/use-premium';
import { useDeleteAccount, useMyProfile, useUpdateMyProfile } from '@/features/profile/api';

export default function ProfileScreen() {
  const { t } = useTranslation('profile');
  const { t: tCommon } = useTranslation('common');
  const profile = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const deleteAccount = useDeleteAccount();
  const premium = usePremium();

  const confirmDelete = () => {
    Alert.alert(t('deleteAccount'), t('deleteAccountConfirm'), [
      { text: tCommon('cancel'), style: 'cancel' },
      { text: t('deleteAccount'), style: 'destructive', onPress: () => deleteAccount.mutate() },
    ]);
  };

  return (
    <Screen>
      <ThemedText type="subtitle">{t('title')}</ThemedText>
      {profile.data ? (
        <>
          <ThemedText>{profile.data.display_name}</ThemedText>
          <View style={styles.row}>
            <ThemedText>{t('hideDistance')}</ThemedText>
            <Switch
              value={profile.data.hide_distance}
              onValueChange={(hide_distance) => updateProfile.mutate({ hide_distance })}
            />
          </View>
          <View style={styles.row}>
            <ThemedText>{t('incognito')}</ThemedText>
            <Switch
              value={profile.data.is_incognito}
              disabled={!premium.data}
              onValueChange={(is_incognito) => updateProfile.mutate({ is_incognito })}
            />
          </View>
          {!premium.data ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('premiumRequired')}
            </ThemedText>
          ) : null}
        </>
      ) : null}
      <View style={styles.actions}>
        <Button label={t('signOut')} variant="secondary" onPress={() => void signOut()} />
        <Button
          label={t('deleteAccount')}
          variant="danger"
          onPress={confirmDelete}
          loading={deleteAccount.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { marginTop: 'auto', gap: Spacing.two, paddingBottom: Spacing.four },
});
