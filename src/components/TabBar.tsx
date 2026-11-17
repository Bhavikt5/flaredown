// Floating dark tab bar (as in the reference) with a blue + button beside it.

import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, IconCircle, T, tap } from './ui';
import { currentMealType, localDate } from '@/lib/db';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', iconOn: 'home' },
  food: { label: 'Food', icon: 'restaurant-outline', iconOn: 'restaurant' },
  insights: { label: 'Insights', icon: 'analytics-outline', iconOn: 'analytics' },
  profile: { label: 'Profile', icon: 'person-outline', iconOn: 'person' },
};

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 12) + 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            backgroundColor: C.dark,
            borderRadius: 30,
            padding: 7,
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          {state.routes.map((route, i) => {
            const meta = TABS[route.name];
            if (!meta) return null;
            const focused = state.index === i;
            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  tap();
                  if (!focused) navigateToTab(route.key);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  height: 46,
                  paddingHorizontal: focused ? 16 : 12,
                  borderRadius: 23,
                  backgroundColor: focused ? '#fff' : 'transparent',
                }}
              >
                <Ionicons name={focused ? meta.iconOn : meta.icon} size={20} color={focused ? C.dark : '#9AA3B2'} />
                {focused ? (
                  <T size={14} weight="semibold" color={C.dark}>
                    {meta.label}
                  </T>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => {
            tap();
            setOpen(true);
          }}
          style={({ pressed }) => ({
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.94 : 1 }],
            shadowColor: C.primary,
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          })}
          accessibilityLabel="Add"
        >
          <Ionicons name="add" size={32} color="#fff" />
        </Pressable>
      </View>

      <QuickAdd visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const ACTIONS: { title: string; sub: string; icon: IconName; color: string; bg: string; go: () => void }[] = [
  {
    title: 'Snap a meal',
    sub: 'AI finds the dishes and scores them',
    icon: 'camera',
    color: C.primary,
    bg: C.primarySoft,
    go: () => router.push('/snap'),
  },
  {
    title: 'Scan a packet',
    sub: 'Barcode on biscuits, chips, sauces',
    icon: 'barcode',
    color: C.dark,
    bg: C.border,
    go: () => router.push({ pathname: '/scan', params: { date: localDate(), meal: currentMealType() } }),
  },
  {
    title: 'Search food',
    sub: 'Pick from 160+ Indian dishes',
    icon: 'search',
    color: C.good,
    bg: C.goodSoft,
    go: () => router.push({ pathname: '/add-food', params: { date: localDate(), meal: currentMealType() } }),
  },
  {
    title: 'Flare photo',
    sub: 'Photograph affected skin',
    icon: 'body',
    color: C.flare,
    bg: C.flareSoft,
    go: () => router.push({ pathname: '/photos', params: { capture: '1' } }),
  },
  {
    title: 'Daily check-in',
    sub: 'Skin, itch, sleep, stress',
    icon: 'checkmark-done',
    color: C.warn,
    bg: C.warnSoft,
    go: () => router.push('/checkin'),
  },
];

function QuickAdd({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(18,24,38,0.45)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: C.bg,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: 20,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
      >
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.faint, marginBottom: 4 }} />
        <T size={20} weight="bold">
          What do you want to log?
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.title}
              onPress={() => {
                tap();
                onClose();
                setTimeout(a.go, 150);
              }}
              style={({ pressed }) => ({
                width: '47.5%',
                backgroundColor: C.card,
                borderRadius: 22,
                padding: 16,
                gap: 10,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <IconCircle icon={a.icon} color={a.color} bg={a.bg} size={48} />
              <T size={15} weight="semibold">
                {a.title}
              </T>
              <T size={12} color={C.muted}>
                {a.sub}
              </T>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
