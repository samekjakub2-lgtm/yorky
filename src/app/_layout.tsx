import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useSessionStore } from '@/features/auth/session-store';
import { AppProviders } from '@/providers/app-providers';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const session = useSessionStore((s) => s.session);
  const initialized = useSessionStore((s) => s.initialized);

  useEffect(() => {
    if (initialized) void SplashScreen.hideAsync();
  }, [initialized]);

  if (!initialized) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </ThemeProvider>
  );
}
