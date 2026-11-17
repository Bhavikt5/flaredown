// Full-screen search to pick one dish (used to correct or add AI results).

import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { allDishes } from '@/lib/db';
import { Dish, dishTags } from '@/data/dishes';
import { TAG_LABELS } from '@/data/ingredients';
import { scoreDish } from '@/lib/score';
import { LEVEL_COLORS } from './charts';
import { C, Input, Pill, T } from './ui';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

type Props = { visible: boolean; title: string; onPick: (d: Dish) => void; onClose: () => void };

// The list is mounted only while open, so the search box starts empty each time.
export function DishPicker(props: Props) {
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose} presentationStyle="pageSheet">
      {props.visible ? <PickerBody {...props} /> : null}
    </Modal>
  );
}

function PickerBody({ title, onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    allDishes().then(setDishes);
  }, []);

  const list = useMemo(() => {
    const nq = norm(q);
    return nq ? dishes.filter((d) => norm(d.name).includes(nq) || norm(d.alt).includes(nq)) : dishes;
  }, [q, dishes]);

  return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 }}>
          <T size={18} weight="semibold" style={{ flex: 1 }}>
            {title}
          </T>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={C.text} />
          </Pressable>
        </View>
        <View style={{ padding: 20, paddingBottom: 8 }}>
          <Input placeholder="Search dishes (e.g. misal, rajma, chai)" value={q} onChangeText={setQ} autoFocus />
        </View>
        <FlatList
          data={list}
          keyExtractor={(d) => d.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }}
          renderItem={({ item: d }) => {
            const sc = scoreDish(d);
            return (
              <Pressable
                onPress={() => onPick(d)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: C.border,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1 }}>
                  <T size={15} weight="medium">
                    {d.name}
                    {d.alt ? <T size={13} color={C.muted}>{` · ${d.alt}`}</T> : null}
                  </T>
                  <T size={11} color={C.muted} numberOfLines={1}>
                    {dishTags(d).map((t) => TAG_LABELS[t]).join(', ') || d.category}
                  </T>
                </View>
                <Pill text={sc.score.toFixed(1)} color={LEVEL_COLORS[sc.level][0]} bg={LEVEL_COLORS[sc.level][1]} />
              </Pressable>
            );
          }}
        />
      </View>
  );
}
