import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays, copyMeals, deleteMeal, listMeals, localDate, MEAL_TYPES, MealEntry } from '@/lib/db';
import { scoreTags } from '@/lib/score';
import { DateBar } from '@/components/DateBar';
import { Gauge, LEVEL_COLORS } from '@/components/charts';
import { Button, C, Card, H1, Pill, Screen, T } from '@/components/ui';

const MEAL_ICONS = { Breakfast: 'cafe', Lunch: 'restaurant', Snack: 'pizza', Dinner: 'moon' } as const;

export default function FoodScreen() {
  const [date, setDate] = useState(localDate());
  const [meals, setMeals] = useState<MealEntry[]>([]);

  const load = useCallback(async () => setMeals(await listMeals(date)), [date]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const copyYesterday = async () => {
    const n = await copyMeals(addDays(date, -1), date);
    if (n === 0) Alert.alert('Nothing to copy', 'No food was logged the day before.');
    load();
  };

  const remove = (m: MealEntry) =>
    Alert.alert('Remove', `Remove ${m.dishName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => (await deleteMeal(m.id), load()) },
    ]);

  const day = meals.length ? scoreTags(meals.flatMap((m) => m.tags)) : null;

  return (
    <Screen padTop tabBar>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H1>Food</H1>
        <Pressable
          onPress={() => router.push('/guide')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          hitSlop={10}
        >
          <Ionicons name="book-outline" size={16} color={C.primary} />
          <T size={14} weight="medium" color={C.primary}>
            Food guide
          </T>
        </Pressable>
      </View>

      <DateBar date={date} onChange={setDate} />

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Gauge score={day?.score ?? null} level={day?.level ?? null} width={130} />
        <View style={{ flex: 1, gap: 6 }}>
          <T size={15} weight="semibold">
            Day’s flare risk
          </T>
          {day ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {day.raises.slice(0, 4).map((r) => (
                <Pill key={r.tag} text={r.label} color={C.flare} bg={C.flareSoft} icon="arrow-up" />
              ))}
              {day.lowers.slice(0, 3).map((r) => (
                <Pill key={r.tag} text={r.label} color={C.good} bg={C.goodSoft} icon="arrow-down" />
              ))}
            </View>
          ) : (
            <T size={12} color={C.muted}>
              Log food to see the score
            </T>
          )}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Snap meal" icon="camera" onPress={() => router.push('/snap')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Copy yesterday" icon="copy-outline" kind="secondary" onPress={copyYesterday} />
        </View>
      </View>

      {MEAL_TYPES.map((type) => {
        const items = meals.filter((m) => m.meal === type);
        const sc = items.length ? scoreTags(items.flatMap((m) => m.tags)) : null;
        return (
          <Card key={type} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={MEAL_ICONS[type]} size={18} color={C.primary} />
              </View>
              <T size={16} weight="semibold" style={{ flex: 1 }}>
                {type}
              </T>
              {sc ? <Pill text={sc.score.toFixed(1)} color={LEVEL_COLORS[sc.level][0]} bg={LEVEL_COLORS[sc.level][1]} /> : null}
              <Pressable
                onPress={() => router.push({ pathname: '/add-food', params: { date, meal: type } })}
                hitSlop={10}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
            {items.map((m) => {
              const ds = scoreTags(m.tags);
              return (
                <Pressable key={m.id} onLongPress={() => remove(m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 46 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: LEVEL_COLORS[ds.level][0] }} />
                  <T size={14} style={{ flex: 1 }}>
                    {m.dishName}
                  </T>
                  <T size={12} color={C.muted}>
                    {ds.score.toFixed(1)}
                  </T>
                  <Pressable onPress={() => remove(m)} hitSlop={10}>
                    <Ionicons name="close" size={16} color={C.faint} />
                  </Pressable>
                </Pressable>
              );
            })}
          </Card>
        );
      })}
    </Screen>
  );
}
