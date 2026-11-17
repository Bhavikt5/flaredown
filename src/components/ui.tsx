// Design system: colours, type and shared building blocks.
// Look follows the reference: bright blue accent, white rounded cards on a
// soft blue-grey background, Inter type, pill controls.

import { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

export const C = {
  bg: '#EEF2F8',
  card: '#FFFFFF',
  text: '#121826',
  muted: '#7A8499',
  faint: '#B4BCCB',
  border: '#E4E9F2',
  primary: '#1F7AF2',
  primaryDark: '#155FC4',
  primarySoft: '#E5EFFE',
  dark: '#16181D',
  flare: '#E5484D',
  flareSoft: '#FDECEC',
  good: '#22A06B',
  goodSoft: '#E3F5EC',
  warn: '#E8930C',
  warnSoft: '#FDF1DE',
  star: '#F5B400',
};

export const F = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const TAB_BAR_SPACE = 110;

export const tap = () => Haptics.selectionAsync().catch(() => {});

type Weight = keyof typeof F;

export function T({
  children,
  size = 15,
  weight = 'regular',
  color = C.text,
  style,
  ...rest
}: TextProps & { size?: number; weight?: Weight; color?: string; children: ReactNode }) {
  return (
    <Text {...rest} style={[{ fontFamily: F[weight], fontSize: size, color, lineHeight: Math.round(size * 1.4) }, style]}>
      {children}
    </Text>
  );
}

export function Screen({
  children,
  padTop = false,
  tabBar = false,
}: {
  children: ReactNode;
  padTop?: boolean;
  tabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{
        padding: 20,
        paddingTop: padTop ? insets.top + 16 : 16,
        paddingBottom: tabBar ? TAB_BAR_SPACE + insets.bottom : 40,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <T size={30} weight="bold" style={{ lineHeight: 36, letterSpacing: -0.5 }}>
      {children}
    </T>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <T size={18} weight="semibold">
      {children}
    </T>
  );
}

export function P({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return (
    <T size={14} color={muted ? C.muted : C.text} style={style}>
      {children}
    </T>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
      <T size={18} weight="semibold">
        {title}
      </T>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <T size={14} weight="medium" color={C.primary}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'dark';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const bg = { primary: C.primary, secondary: C.card, danger: C.flareSoft, dark: C.dark }[kind];
  const fg = { primary: '#fff', secondary: C.primary, danger: C.flare, dark: '#fff' }[kind];
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        kind === 'secondary' && { borderWidth: 1, borderColor: C.border },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <T size={16} weight="semibold" color={fg}>
        {title}
      </T>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} hitSlop={6}>
      <Ionicons name={icon} size={21} color={C.text} />
      {badge ? <View style={s.dot} /> : null}
    </Pressable>
  );
}

export function Chip({ label, on, onPress, color = C.primary }: { label: string; on: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={[s.chip, on ? { backgroundColor: color, borderColor: color } : null]}
    >
      <T size={14} weight={on ? 'semibold' : 'medium'} color={on ? '#fff' : C.muted}>
        {label}
      </T>
    </Pressable>
  );
}

export function ChipRow({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
        {children}
      </ScrollView>
    );
  }
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

/** 0-10 rating as a row of tappable pills. */
export function Score({
  label,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  low: string;
  high: string;
}) {
  const color = value >= 7 ? C.flare : value >= 4 ? C.warn : C.primary;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T size={15} weight="medium">
          {label}
        </T>
        <T size={20} weight="bold" color={color}>
          {value}
          <T size={13} color={C.muted}>
            /10
          </T>
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: 11 }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => {
              tap();
              onChange(i);
            }}
            style={[s.scoreCell, i <= value && { backgroundColor: i === value ? color : color + '33' }]}
          >
            <T size={12} weight="semibold" color={i === value ? '#fff' : i < value ? color : C.muted}>
              {i}
            </T>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T size={12} color={C.muted}>
          {low}
        </T>
        <T size={12} color={C.muted}>
          {high}
        </T>
      </View>
    </View>
  );
}

/** Number with - and + buttons. */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 24,
  unit,
  icon,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const set = (v: number) => {
    tap();
    onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)));
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon ? <IconCircle icon={icon} size={36} /> : null}
        <T size={15} weight="medium">
          {label}
        </T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable style={s.stepBtn} onPress={() => set(value - step)}>
          <Ionicons name="remove" size={18} color={C.primary} />
        </Pressable>
        <T size={16} weight="semibold" style={{ minWidth: 62, textAlign: 'center' }}>
          {value}
          {unit ? ` ${unit}` : ''}
        </T>
        <Pressable style={s.stepBtn} onPress={() => set(value + step)}>
          <Ionicons name="add" size={18} color={C.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={C.faint} {...props} style={[s.input, props.style]} />;
}

export function Pill({ text, color, bg, icon }: { text: string; color: string; bg: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <T size={12} weight="semibold" color={color}>
        {text}
      </T>
    </View>
  );
}

export function IconCircle({
  icon,
  color = C.primary,
  bg = C.primarySoft,
  size = 44,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </View>
  );
}

/** Row used in settings-style lists. */
export function ListRow({
  icon,
  title,
  sub,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}
    >
      <IconCircle icon={icon} size={40} />
      <View style={{ flex: 1 }}>
        <T size={15} weight="medium">
          {title}
        </T>
        {sub ? (
          <T size={12} color={C.muted}>
            {sub}
          </T>
        ) : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={C.faint} />}
    </Pressable>
  );
}

export const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 18,
    gap: 12,
    shadowColor: '#1B2B4B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  btn: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2B4B',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dot: { position: 'absolute', top: 11, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: C.flare },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  scoreCell: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: F.regular,
    color: C.text,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
