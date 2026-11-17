import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, C, Card, Input, T, tap } from './ui';

export function Welcome({ onDone }: { onDone: (name: string) => void }) {
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const insets = useSafeAreaInsets();

  if (step === 0) {
    return (
      <LinearGradient colors={['#2C86FA', '#1663D6']} style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 260,
              height: 260,
              borderRadius: 130,
              backgroundColor: 'rgba(255,255,255,0.10)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 170,
                height: 170,
                borderRadius: 48,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#0B3A80',
                shadowOpacity: 0.35,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 14 },
                elevation: 16,
                transform: [{ rotate: '-8deg' }],
              }}
            >
              <Ionicons name="leaf" size={88} color={C.primary} />
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: 28, gap: 14, alignItems: 'center' }}>
          <T size={34} weight="bold" color="#fff" style={{ textAlign: 'center', lineHeight: 42, letterSpacing: -0.6 }}>
            Your Skin,{'\n'}Understood
          </T>
          <T size={15} color="rgba(255,255,255,0.88)" style={{ textAlign: 'center' }}>
            Log meals, sleep and stress. Flare Down finds what triggers your psoriasis.
          </T>
          <Pressable
            onPress={() => {
              tap();
              setStep(1);
            }}
            style={({ pressed }) => ({
              marginTop: 18,
              width: '100%',
              backgroundColor: '#fff',
              borderRadius: 22,
              padding: 8,
              paddingLeft: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <T size={17} weight="semibold">
              Get started
            </T>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-forward" size={22} color="#fff" />
            </View>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30, gap: 16 }}>
        <T size={30} weight="bold" style={{ lineHeight: 36 }}>
          What should we{'\n'}call you?
        </T>
        <Input placeholder="Your first name" value={name} onChangeText={setName} autoFocus autoCapitalize="words" />

        <Card>
          <T size={16} weight="semibold">
            How it works
          </T>
          {[
            ['checkmark-done', 'A 1-minute check-in each evening'],
            ['camera', 'Snap meals; AI shows a flare risk score'],
            ['analytics', 'After 21 days, see your possible triggers'],
            ['document-text', 'Share a one-page report with your doctor'],
          ].map(([icon, text]) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={C.primary} />
              <T size={14} style={{ flex: 1 }}>
                {text}
              </T>
            </View>
          ))}
        </Card>

        <Card style={{ backgroundColor: C.warnSoft }}>
          <T size={16} weight="semibold">
            Important
          </T>
          <T size={13}>
            Flare Down is a tracking tool, not medical advice. It cannot diagnose or treat psoriasis. Never stop or change
            prescribed medicine because of the app. See a doctor quickly for a sudden widespread flare, fever, pus-filled
            spots or swollen joints.
          </T>
        </Card>

        <Pressable
          onPress={() => {
            tap();
            setAgreed(!agreed);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={24} color={agreed ? C.primary : C.muted} />
          <T size={14}>I understand</T>
        </Pressable>

        <Button title="Start" onPress={() => onDone(name.trim())} disabled={!agreed || !name.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
