import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getSetting, listCheckins, prettyDate, setSetting } from '@/lib/db';
import { refreshWeather, shareBackup, shareDoctorReport } from '@/lib/services';
import { currentUserEmail, signOut, syncNow } from '@/lib/sync';
import { hasGemini, hasSupabase } from '@/lib/config';
import { C, Card, H1, Input, ListRow, Pill, Screen, T, tap } from '@/components/ui';

export default function Profile() {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [photoCloud, setPhotoCloud] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [weatherOn, setWeatherOn] = useState(true);
  const [days, setDays] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setName((await getSetting('name')) ?? '');
    setEmail(await currentUserEmail());
    setLastSync(await getSetting('last_sync'));
    setSyncError((await getSetting('last_sync_error')) || null);
    setPhotoCloud((await getSetting('photo_cloud')) === '1');
    setLastBackup(await getSetting('last_backup'));
    setWeatherOn((await getSetting('weather_enabled')) !== '0');
    setDays((await listCheckins()).length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const run = async (key: string, fn: () => Promise<unknown>, fail: string) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Something went wrong', `${fail}\n\n${String(e)}`);
    } finally {
      setBusy(null);
      load();
    }
  };

  const doSync = () =>
    run(
      'sync',
      async () => {
        const r = await syncNow();
        if (!r.ok) Alert.alert('Sync failed', r.message);
      },
      'Could not sync.',
    );

  const saveName = async () => {
    await setSetting('name', name.trim());
    setEditing(false);
  };

  const toggleWeather = async () => {
    const next = !weatherOn;
    await setSetting('weather_enabled', next ? '1' : '0');
    setWeatherOn(next);
    if (next && !(await refreshWeather(true))) {
      Alert.alert('Weather not updated', 'Location permission is needed, and the phone must be online.');
    }
  };

  const togglePhotoCloud = async () => {
    const next = !photoCloud;
    if (next) {
      Alert.alert(
        'Back up skin photos?',
        'Your skin photos will be uploaded to your private Supabase storage. Only your account can see them.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Back up',
            onPress: async () => {
              await setSetting('photo_cloud', '1');
              setPhotoCloud(true);
              doSync();
            },
          },
        ],
      );
    } else {
      await setSetting('photo_cloud', '0');
      setPhotoCloud(false);
    }
  };

  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <Screen padTop tabBar>
      <H1>Profile</H1>

      {/* Person */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
          <T size={24} weight="bold" color="#fff">
            {initial}
          </T>
        </View>
        {editing ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Input value={name} onChangeText={setName} autoFocus style={{ flex: 1, paddingVertical: 10 }} onSubmitEditing={saveName} />
            <Pressable onPress={saveName} hitSlop={8}>
              <Ionicons name="checkmark-circle" size={30} color={C.primary} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={{ flex: 1 }} onPress={() => setEditing(true)}>
            <T size={20} weight="bold">
              {name || 'Add your name'}
            </T>
            <T size={12} color={C.muted}>
              {days} days logged · tap to edit name
            </T>
          </Pressable>
        )}
      </Card>

      {/* Cloud */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={17} weight="semibold">
            Cloud sync
          </T>
          {email ? <Pill text="Connected" color={C.good} bg={C.goodSoft} icon="cloud-done" /> : <Pill text="Off" color={C.muted} bg={C.bg} />}
        </View>
        {!hasSupabase() ? (
          <T size={13} color={C.muted}>
            Add your Supabase URL and publishable key to the .env file to turn on cloud sync. See the setup guide.
          </T>
        ) : email ? (
          <>
            <ListRow
              icon="person-circle-outline"
              title={email}
              sub={
                syncError
                  ? `Last error: ${syncError}`
                  : lastSync
                    ? `Last synced ${new Date(lastSync).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
                    : 'Not synced yet'
              }
              onPress={doSync}
              right={busy === 'sync' ? <ActivityIndicator color={C.primary} /> : <Ionicons name="sync" size={20} color={C.primary} />}
            />
            <ListRow
              icon={photoCloud ? 'images' : 'images-outline'}
              title={`Back up skin photos: ${photoCloud ? 'on' : 'off'}`}
              sub="Private bucket, only your account can see them"
              onPress={togglePhotoCloud}
            />
            <ListRow
              icon="log-out-outline"
              title="Sign out"
              sub="Data stays on this phone"
              onPress={() =>
                Alert.alert('Sign out?', 'Your data stays on this phone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: async () => (await signOut(), load()) },
                ])
              }
            />
          </>
        ) : (
          <ListRow icon="log-in-outline" title="Sign in or create account" sub="Back up and sync with Supabase" onPress={() => router.push('/account')} />
        )}
      </Card>

      {/* Doctor */}
      <Card>
        <T size={17} weight="semibold">
          For your doctor
        </T>
        <ListRow
          icon="document-text-outline"
          title="Share 30-day report (PDF)"
          sub="Trend, areas, treatments, triggers, photos"
          onPress={() => run('report', () => shareDoctorReport(30), 'Could not create the report.')}
          right={busy === 'report' ? <ActivityIndicator color={C.primary} /> : undefined}
        />
        <ListRow icon="medkit-outline" title="My treatments" sub="Creams, tablets, injections" onPress={() => router.push('/treatments')} />
        <ListRow icon="images-outline" title="Skin photos" sub="Photos by body area, compare over time" onPress={() => router.push('/photos')} />
      </Card>

      {/* Habits */}
      <Card>
        <T size={17} weight="semibold">
          Settings
        </T>
        <ListRow icon="notifications-outline" title="Reminders" sub="Check-in and medicine" onPress={() => router.push('/reminders')} />
        <ListRow icon="nutrition-outline" title="Food guide" sub="What research says about each food group" onPress={() => router.push('/guide')} />
        <ListRow
          icon={weatherOn ? 'partly-sunny-outline' : 'cloud-offline-outline'}
          title={`Weather tracking: ${weatherOn ? 'on' : 'off'}`}
          sub="Humidity and temperature for your city"
          onPress={() => {
            tap();
            toggleWeather();
          }}
        />
        <ListRow
          icon="camera-outline"
          title={`Meal photo AI: ${hasGemini() ? 'ready' : 'not set up'}`}
          sub={hasGemini() ? 'Google Gemini free tier' : 'Add a free Gemini key to .env'}
          onPress={() => router.push('/snap')}
        />
      </Card>

      {/* Data */}
      <Card>
        <T size={17} weight="semibold">
          Your data
        </T>
        <ListRow
          icon="download-outline"
          title="Export backup file"
          sub={lastBackup ? `Last export: ${prettyDate(lastBackup)}` : 'JSON file, save to Google Drive'}
          onPress={() => run('backup', shareBackup, 'Could not create the backup.')}
        />
        <ListRow icon="information-circle-outline" title="How it works and safety" onPress={() => router.push('/about')} />
      </Card>

      <T size={11} color={C.faint} style={{ textAlign: 'center' }}>
        Flare Down prototype · not medical advice
      </T>
    </Screen>
  );
}
