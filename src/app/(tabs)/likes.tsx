import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

// TODO: zoznam lajkov a matchov (like_profile, likes, matches).
export default function LikesScreen() {
  const { t } = useTranslation('likes');

  return (
    <Screen>
      <ThemedText type="subtitle">{t('title')}</ThemedText>
    </Screen>
  );
}
