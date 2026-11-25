import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { EmailSchema, useSendOtp, useVerifyOtp } from '@/features/auth/api';

export default function SignInScreen() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string>();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const onSendCode = () => {
    if (!EmailSchema.safeParse(email.trim()).success) {
      setError(t('errors.invalidEmail'));
      return;
    }
    setError(undefined);
    sendOtp.mutate(email, { onSuccess: () => setCodeSent(true) });
  };

  const onVerify = () => {
    verifyOtp.mutate({ email, token: code }, { onError: () => setError(t('errors.invalidCode')) });
  };

  return (
    <Screen>
      <View style={styles.content}>
        <ThemedText type="subtitle">{t('title')}</ThemedText>
        <ThemedText themeColor="textSecondary">{t('subtitle')}</ThemedText>

        {!codeSent ? (
          <>
            <TextField
              label={t('emailLabel')}
              placeholder={t('emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              error={error}
            />
            <Button label={t('sendCode')} onPress={onSendCode} loading={sendOtp.isPending} />
          </>
        ) : (
          <>
            <TextField
              label={t('codeLabel')}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              error={error}
            />
            <Button label={t('verify')} onPress={onVerify} loading={verifyOtp.isPending} />
            <Button
              label={t('changeEmail')}
              variant="secondary"
              onPress={() => setCodeSent(false)}
            />
          </>
        )}

        <ThemedText type="small" themeColor="textSecondary">
          {t('ageNotice')}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', gap: Spacing.three },
});
