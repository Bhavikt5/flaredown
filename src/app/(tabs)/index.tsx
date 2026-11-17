import { useCallback, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  addDays,
  Checkin,
  currentMealType,
  getCheckin,
  getSetting,
  listCheckins,
  listMeals,
  listWeather,
  localDate,
  MealEntry,
  Weather,
} from '@/lib/db';
import { runEngine, EngineResult, MIN_CHECKIN_DAYS } from '@/lib/engine';
import { insightLabel, loadEngineInputs } from '@/lib/insights';
import { scoreTags, ScoreResult } from '@/lib/score';
import { Gauge, LEVEL_COLORS, Ring, skinColor, TrendLine, TrendPoint } from '@/components/charts';
import { C, Card, Chip, IconButton, IconCircle, Pill, Screen, SectionHeader, T } from '@/components/ui';

type Range = 7 | 30;

export default function Home() {
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [today, setToday] = useState<Checkin | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [engine, setEngine] = useState<EngineResult | null>(null);
  const [range, setRange] = useState<Range>(7);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const d = localDate();
        setName((await getSetting('name')) ?? '');
        setToday(await getCheckin(d));
        setCheckins(await listCheckins(addDays(d, -29)));
        setMeals(await listMeals(d));
        setWeather((await listWeather()).find((w) => w.date === d) ?? null);
        setEngine(runEngine(...(await loadEngineInputs())));
      })();
    }, []),
  );

  const d = localDate();
  const food: ScoreResult | null = meals.length ? scoreTags(meals.flatMap((m) => m.tags)) : null;
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const points: TrendPoint[] = Array.from({ length: range }, (_, i) => {
    const date = addDays(d, i - range + 1);
    const c = byDate.get(date);
    return { date, value: c ? c.skin : null, flare: !!c?.flare };
  });
  const last7 = Array.from({ length: 7 }, (_, i) => byDate.has(addDays(d, -i))).filter(Boolean).length;
  let streak = 0;
  for (let i = today ? 0 : 1; byDate.has(addDays(d, -i)); i++) streak++;
  const topTrigger = engine?.insights.find((i) => i.direction === 'more');
  const chartWidth = width - 40 - 36;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen padTop tabBar>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T size={15} color={C.muted}>
            {greeting}
          </T>
          <T size={32} weight="bold" style={{ lineHeight: 38, letterSpacing: -0.6 }}>
            Hello,{'\n'}
            {name || 'there'}
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconButton icon="notifications-outline" onPress={() => router.push('/reminders')} badge={!today} />
          <IconButton icon="search-outline" onPress={() => router.push({ pathname: '/add-food', params: { date: d, meal: currentMealType() } })} />
        </View>
      </View>

      {/* Today hero */}
      <Pressable onPress={() => router.push('/checkin')}>
        <LinearGradient
          colors={['#2C86FA', '#1663D6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 26, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 18 }}
        >
          <View
            style={{
              width: 108,
              height: 108,
              borderRadius: 54,
              backgroundColor: 'rgba(255,255,255,0.14)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ring
              value={today?.skin ?? null}
              size={96}
              stroke={9}
              color="#fff"
              label={today ? String(today.skin) : '–'}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <T size={13} weight="medium" color="rgba(255,255,255,0.8)">
              Today’s skin
            </T>
            {today ? (
              <>
                <T size={20} weight="bold" color="#fff">
                  {today.flare ? 'Flare day' : today.skin <= 3 ? 'Calm skin' : today.skin <= 6 ? 'Some irritation' : 'Rough day'}
                </T>
                <T size={13} color="rgba(255,255,255,0.85)">
                  Itch {today.itch}/10 · Sleep {today.sleepHours}h · Stress {today.stress}/10
                </T>
              </>
            ) : (
              <>
                <T size={20} weight="bold" color="#fff">
                  Check in for today
                </T>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#fff',
                    borderRadius: 14,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                  }}
                >
                  <T size={13} weight="semibold" color={C.primary}>
                    Takes 1 minute
                  </T>
                  <Ionicons name="arrow-forward" size={14} color={C.primary} />
                </View>
              </>
            )}
            {weather ? (
              <T size={12} color="rgba(255,255,255,0.75)">
                {weather.humidity != null ? `Humidity ${Math.round(weather.humidity)}%` : ''}
                {weather.tempMin != null && weather.tempMax != null
                  ? ` · ${Math.round(weather.tempMin)}–${Math.round(weather.tempMax)}°C`
                  : ''}
              </T>
            ) : null}
          </View>
        </LinearGradient>
      </Pressable>

      {/* Food score + streak */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1.25, alignItems: 'center', paddingHorizontal: 12 }} onPress={() => router.push('/food')}>
          <T size={13} weight="medium" color={C.muted} style={{ alignSelf: 'flex-start' }}>
            Food flare risk
          </T>
          <Gauge score={food?.score ?? null} level={food?.level ?? null} width={140} />
          <T size={11} color={C.muted} numberOfLines={1}>
            {food?.raises.length ? `Up: ${food.raises.slice(0, 2).map((r) => r.label).join(', ')}` : 'General research score'}
          </T>
        </Card>
        <Card style={{ flex: 1, justifyContent: 'space-between' }}>
          <IconCircle icon="flame" color={C.warn} bg={C.warnSoft} size={40} />
          <View>
            <T size={28} weight="bold" style={{ lineHeight: 32 }}>
              {streak}
              <T size={14} color={C.muted}>
                {' '}
                day{streak === 1 ? '' : 's'}
              </T>
            </T>
            <T size={12} color={C.muted}>
              Logging streak · {last7}/7 this week
            </T>
          </View>
        </Card>
      </View>

      {/* Quick actions */}
      <SectionHeader title="Quick log" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(
          [
            ['Snap meal', 'camera', C.primary, C.primarySoft, () => router.push('/snap')],
            ['Check-in', 'checkmark-done', C.warn, C.warnSoft, () => router.push('/checkin')],
            ['Flare photo', 'body', C.flare, C.flareSoft, () => router.push({ pathname: '/photos', params: { capture: '1' } })],
            ['Scan packet', 'barcode', C.good, C.goodSoft, () => router.push({ pathname: '/scan', params: { date: d, meal: currentMealType() } })],
          ] as const
        ).map(([label, icon, color, bg, go]) => (
          <Pressable
            key={label}
            onPress={go}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: C.card,
              borderRadius: 20,
              paddingVertical: 14,
              alignItems: 'center',
              gap: 8,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <IconCircle icon={icon} color={color} bg={bg} size={46} />
            <T size={12} weight="medium">
              {label}
            </T>
          </Pressable>
        ))}
      </View>

      {/* Trend */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={17} weight="semibold">
            Skin trend
          </T>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Chip label="7D" on={range === 7} onPress={() => setRange(7)} />
            <Chip label="30D" on={range === 30} onPress={() => setRange(30)} />
          </View>
        </View>
        {points.some((p) => p.value != null) ? (
          <TrendLine points={points} width={chartWidth} height={130} />
        ) : (
          <View style={{ height: 110, alignItems: 'center', justifyContent: 'center' }}>
            <T size={13} color={C.muted}>
              Your trend appears after your first check-ins
            </T>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Legend color={C.primary} label="Skin rating (0 clear – 10 worst)" />
          <Legend color={C.flare} label="Flare" />
        </View>
      </Card>

      {/* Insight preview */}
      <Card onPress={() => router.push('/insights')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconCircle icon="sparkles" size={44} />
          <View style={{ flex: 1 }}>
            {engine && !engine.ready ? (
              <>
                <T size={15} weight="semibold">
                  Finding your triggers
                </T>
                <T size={12} color={C.muted}>
                  {engine.checkinDays} of {MIN_CHECKIN_DAYS} days logged
                </T>
              </>
            ) : topTrigger ? (
              <>
                <T size={15} weight="semibold">
                  Possible trigger: {insightLabel(topTrigger.key)}
                </T>
                <T size={12} color={C.muted}>
                  {topTrigger.ratio.toFixed(1)}x more flares · {topTrigger.confidence} confidence
                </T>
              </>
            ) : (
              <>
                <T size={15} weight="semibold">
                  No clear trigger yet
                </T>
                <T size={12} color={C.muted}>
                  Keep logging daily
                </T>
              </>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.faint} />
        </View>
        {engine && !engine.ready ? (
          <View style={{ height: 8, backgroundColor: C.bg, borderRadius: 4, overflow: 'hidden' }}>
            <View
              style={{
                width: `${Math.min(100, (engine.checkinDays / MIN_CHECKIN_DAYS) * 100)}%`,
                height: '100%',
                backgroundColor: C.primary,
                borderRadius: 4,
              }}
            />
          </View>
        ) : null}
      </Card>

      {/* Today's meals */}
      <SectionHeader title="Today’s meals" action="View all" onAction={() => router.push('/food')} />
      {meals.length === 0 ? (
        <Card onPress={() => router.push('/snap')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconCircle icon="camera" size={44} />
          <View style={{ flex: 1 }}>
            <T size={15} weight="semibold">
              Snap your first meal
            </T>
            <T size={12} color={C.muted}>
              AI spots the dishes and shows the flare risk
            </T>
          </View>
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          {meals.map((m) => {
            const sc = scoreTags(m.tags);
            const [fg, bg] = LEVEL_COLORS[sc.level];
            return (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fg }} />
                <View style={{ flex: 1 }}>
                  <T size={14} weight="medium">
                    {m.dishName}
                  </T>
                  <T size={11} color={C.muted}>
                    {m.meal}
                  </T>
                </View>
                <Pill text={sc.score.toFixed(1)} color={fg} bg={bg} />
              </View>
            );
          })}
        </Card>
      )}

      {today && today.skin >= 7 ? (
        <Card style={{ backgroundColor: C.flareSoft }}>
          <T size={13} color={C.text}>
            High skin score today. If you have fever, pus-filled spots, a sudden widespread rash or swollen joints, see a
            doctor quickly.
          </T>
        </Card>
      ) : null}
      <View style={{ height: 4 }} />
      <T size={11} color={C.faint} style={{ textAlign: 'center' }}>
        Skin colour key: <T size={11} color={skinColor(2)}>calm</T> · <T size={11} color={skinColor(5)}>irritated</T> ·{' '}
        <T size={11} color={skinColor(8)}>flare</T>
      </T>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <T size={11} color={C.muted}>
        {label}
      </T>
    </View>
  );
}
