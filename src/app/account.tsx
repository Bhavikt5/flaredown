import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { signIn, syncNow } from '@/lib/sync';
import { Button, C, Card, Chip, ChipRow, IconCircle, Input, P, Screen, T } from '@/components/ui';

export default function Account() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.includes('@') || password.length < 6) {
      return Alert.alert('Check your details', 'Enter a valid email and a password of at least 6 characters.');
    }
    setBusy(true);
    const err = await signIn(email.trim(), password, mode === 'up');
    if (err) {
      setBusy(false);
      return Alert.alert(mode === 'up' ? 'Sign up' : 'Sign in', err);
    }
    const r = await syncNow();
    setBusy(false);
    if (!r.ok) Alert.alert('Signed in, but sync failed', r.message);
    router.back();
  };

  return (
    <Screen>
      <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
        <IconCircle icon="cloud-upload" size={64} />
        <T size={20} weight="bold">
          Back up to the cloud
        </T>
        <P muted style={{ textAlign: 'center' }}>
          Your logs sync to your own Supabase project, so they survive a lost or new phone.
        </P>
      </Card>

      <ChipRow>
        <Chip label="Sign in" on={mode === 'in'} onPress={() => setMode('in')} />
        <Chip label="Create account" on={mode === 'up'} onPress={() => setMode('up')} />
      </ChipRow>

      <View style={{ gap: 10 }}>
        <Input placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Input placeholder="Password (6+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      </View>

      <Button title={busy ? 'Please wait…' : mode === 'up' ? 'Create account' : 'Sign in'} onPress={submit} disabled={busy} />
      <T size={12} color={C.muted} style={{ textAlign: 'center' }}>
        The app works fully offline without an account.
      </T>
    </Screen>
  );
}
