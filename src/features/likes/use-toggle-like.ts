import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useLikeProfile, useMyLikedIds, useUnlikeProfile } from '@/features/likes/api';

/** Lajkne / odlajkne profil a pri vzájomnom like-u ukáže oznámenie o matchi. */
export function useToggleLike() {
  const { t } = useTranslation('likes');
  const liked = useMyLikedIds();
  const like = useLikeProfile();
  const unlike = useUnlikeProfile();

  const isLiked = (userId: string) => liked.data?.has(userId) ?? false;

  const toggle = (userId: string, displayName: string) => {
    if (isLiked(userId)) {
      unlike.mutate(userId);
      return;
    }
    like.mutate(userId, {
      onSuccess: (matchId) => {
        if (matchId) Alert.alert(t('matchTitle'), t('matchBody', { name: displayName }));
      },
      onError: () => Alert.alert(t('errors.likeFailed')),
    });
  };

  const isPending = (userId: string) =>
    (like.isPending && like.variables === userId) ||
    (unlike.isPending && unlike.variables === userId);

  return { isLiked, toggle, isPending };
}
