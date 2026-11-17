import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View, ToastAndroid, Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addMeal, allDishes, listFavourites, MealType, recentDishIds, toggleFavourite } from '@/lib/db';
import { Dish, dishTags } from '@/data/dishes';
import { TAG_LABELS } from '@/data/ingredients';
import { C, Input, T } from '@/components/ui';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export default function AddFood() {
  const { date, meal } = useLocalSearchParams<{ date: string; meal: MealType }>();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setDishes(await allDishes());
        setFavs(await listFavourites());
        setRecent(await recentDishIds());
      })();
    }, []),
  );

  const list = useMemo(() => {
    const nq = norm(q);
    if (nq) {
      return dishes.filter((d) => norm(d.name).includes(nq) || norm(d.alt).includes(nq) || norm(d.category).includes(nq));
    }
    const byId = new Map(dishes.map((d) => [d.id, d]));
    const top = [...new Set([...favs, ...recent])].map((id) => byId.get(id)).filter(Boolean) as Dish[];
    const topIds = new Set(top.map((d) => d.id));
    return [...top, ...dishes.filter((d) => !topIds.has(d.id))];
  }, [q, dishes, favs, recent]);

  const add = async (d: Dish) => {
    await addMeal(date, meal, d);
    setAdded((a) => [...a, d.name]);
    if (Platform.OS === 'android') ToastAndroid.show(`Added ${d.name}`, ToastAndroid.SHORT);
  };

  const star = async (d: Dish) => {
    const on = !favs.includes(d.id);
    await toggleFavourite(d.id, on);
    setFavs(on ? [...favs, d.id] : favs.filter((x) => x !== d.id));
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ color: C.muted }}>
          Adding to {meal}
          {added.length ? ` · added: ${added.join(', ')}` : ''}
        </Text>
        <Input placeholder="Search dishes (e.g. rajma, poha, chai)" value={q} onChangeText={setQ} autoFocus />
      </View>
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10 }}>
            <Pressable
              onPress={() => router.push({ pathname: '/scan', params: { date, meal } })}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: C.card }}
            >
              <Ionicons name="barcode-outline" size={20} color={C.primary} />
              <T size={14} weight="semibold" color={C.primary}>
                Scan packet
              </T>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/new-dish', params: { name: q } })}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: C.card }}
            >
              <Ionicons name="create-outline" size={20} color={C.primary} />
              <T size={14} weight="semibold" color={C.primary} numberOfLines={1} style={{ flex: 1 }}>
                {q ? `Create “${q}”` : 'Create dish'}
              </T>
            </Pressable>
          </View>
        }
        renderItem={({ item: d }) => (
          <Pressable
            onPress={() => add(d)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 16, color: C.text }}>
                {d.name}
                {d.alt ? <Text style={{ color: C.muted }}> · {d.alt}</Text> : null}
              </Text>
              <Text style={{ fontSize: 12, color: C.muted }} numberOfLines={1}>
                {dishTags(d).map((t) => TAG_LABELS[t]).join(', ') || d.category}
              </Text>
            </View>
            <Pressable onPress={() => star(d)} hitSlop={12} style={{ padding: 4 }}>
              <Ionicons name={favs.includes(d.id) ? 'star' : 'star-outline'} size={20} color={favs.includes(d.id) ? C.warn : C.muted} />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}
