import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { initDb, getSetting, setSetting } from '@/lib/db';
import { refreshWeather } from '@/lib/services';
import { syncNow } from '@/lib/sync';
import { Welcome } from '@/components/Welcome';
import { C, F } from '@/components/ui';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [state, setState] = useState<'loading' | 'welcome' | 'ready'>('loading');

  useEffect(() => {
    (async () => {
      await initDb();
      const onboarded = await getSetting('onboarded');
      setState(onboarded ? 'ready' : 'welcome');
      if (onboarded) {
        refreshWeather().catch(() => {});
        syncNow().catch(() => {});
      }
    })();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncNow().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  if (state === 'loading' || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (state === 'welcome') {
    return (
      <Welcome
        onDone={async (name) => {
          await setSetting('name', name);
          await setSetting('onboarded', new Date().toISOString());
          setState('ready');
          refreshWeather().catch(() => {});
        }}
      />
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerShadowVisible: false,
          headerTintColor: C.text,
          headerTitleStyle: { fontFamily: F.semibold, fontSize: 17 },
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="checkin" options={{ title: 'Daily check-in' }} />
        <Stack.Screen name="snap" options={{ title: 'Snap a meal' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan a packet' }} />
        <Stack.Screen name="add-food" options={{ title: 'Add food' }} />
        <Stack.Screen name="new-dish" options={{ title: 'New dish' }} />
        <Stack.Screen name="photos" options={{ title: 'Skin photos' }} />
        <Stack.Screen name="guide" options={{ title: 'Food guide' }} />
        <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
        <Stack.Screen name="treatments" options={{ title: 'My treatments' }} />
        <Stack.Screen name="account" options={{ title: 'Cloud account' }} />
        <Stack.Screen name="about" options={{ title: 'How it works' }} />
      </Stack>
    </>
  );
}
