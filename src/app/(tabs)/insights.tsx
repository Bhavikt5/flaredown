import { useCallback, useState } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { addDays, Checkin, listCheckins, localDate } from '@/lib/db';
import { runEngine, EngineResult, MIN_CHECKIN_DAYS, Insight } from '@/lib/engine';
import { insightKind, insightLabel, loadEngineInputs } from '@/lib/insights';
import { Ring, TrendLine, TrendPoint } from '@/components/charts';
import { Button, C, Card, H1, IconCircle, P, Pill, Screen, SectionHeader, T } from '@/components/ui';

const CONF: Record<Insight['confidence'], [string, string]> = {
  High: [C.flare, C.flareSoft],
  Medium: [C.warn, C.warnSoft],
  Low: [C.muted, C.bg],
};

const KIND_ICON = { 'Food group': 'nutrition', Ingredient: 'leaf', Weather: 'partly-sunny', Lifestyle: 'walk' } as const;

function sentence(i: Insight): string {
  const label = insightLabel(i.key).toLowerCase();
  return i.direction === 'more'
    ? `Flares were ${i.ratio.toFixed(1)}x more likely ${i.window} after ${label}.`
    : `Flares were ${(1 / i.ratio).toFixed(1)}x less likely ${i.window} after ${label}.`;
}

export default function InsightsScreen() {
  const { width } = useWindowDimensions();
  const [result, setResult] = useState<EngineResult | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setResult(runEngine(...(await loadEngineInputs())));
        setCheckins(await listCheckins(addDays(localDate(), -29)));
      })();
    }, []),
  );

  if (!result) return <ActivityIndicator style={{ marginTop: 80 }} color={C.primary} />;

  const today = localDate();
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const points: TrendPoint[] = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i - 29);
    const c = byDate.get(date);
    return { date, value: c ? c.skin : null, flare: !!c?.flare };
  });
  const avg = (xs: Checkin[]) => (xs.length ? xs.reduce((s, c) => s + c.skin, 0) / xs.length : null);
  const a7 = avg(checkins.filter((c) => c.date >= addDays(today, -6)));
  const p7 = avg(checkins.filter((c) => c.date < addDays(today, -6) && c.date >= addDays(today, -13)));
  const increases = result.insights.filter((i) => i.direction === 'more');
  const decreases = result.insights.filter((i) => i.direction === 'fewer');

  return (
    <Screen padTop tabBar>
      <H1>Insights</H1>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Ring
            value={result.checkinDays}
            max={MIN_CHECKIN_DAYS}
            size={92}
            stroke={9}
            color={C.primary}
            label={String(Math.min(result.checkinDays, 999))}
            caption={`of ${MIN_CHECKIN_DAYS} days`}
          />
          <T size={12} color={C.muted}>
            Days logged
          </T>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Ring value={result.flareDays} max={Math.max(result.checkinDays, 1)} size={92} stroke={9} color={C.flare} label={String(result.flareDays)} caption="flare days" />
          <T size={12} color={C.muted}>
            All time
          </T>
        </Card>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={17} weight="semibold">
            Last 30 days
          </T>
          {a7 != null && p7 != null ? (
            <Pill
              text={a7 < p7 ? `Better than last week` : a7 > p7 ? `Worse than last week` : 'Same as last week'}
              color={a7 < p7 ? C.good : a7 > p7 ? C.flare : C.muted}
              bg={a7 < p7 ? C.goodSoft : a7 > p7 ? C.flareSoft : C.bg}
              icon={a7 < p7 ? 'trending-down' : a7 > p7 ? 'trending-up' : 'remove'}
            />
          ) : null}
        </View>
        <TrendLine points={points} width={width - 40 - 36} height={140} />
        <T size={11} color={C.muted}>
          Skin rating per day · red dots are flares · gaps are days not logged
        </T>
      </Card>

      {!result.ready ? (
        <Card>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <IconCircle icon="hourglass" size={44} />
            <View style={{ flex: 1 }}>
              <T size={16} weight="semibold">
                Learning your patterns
              </T>
              <T size={12} color={C.muted}>
                {MIN_CHECKIN_DAYS - result.checkinDays} more check-in days needed
              </T>
            </View>
          </View>
          <P muted>
            Triggers can take 1 to 14 days to show on the skin, so the app needs a few weeks of daily check-ins and food logs
            before it can look for links.
          </P>
        </Card>
      ) : result.insights.length === 0 ? (
        <Card>
          <T size={16} weight="semibold">
            No clear links yet
          </T>
          <P muted>
            {result.flareDays < 3
              ? `Only ${result.flareDays} flare days so far; at least 3 are needed to compare. Good news for your skin.`
              : 'Your flares may not be tied to anything you log, or more data is needed. Keep logging.'}
          </P>
        </Card>
      ) : null}

      {increases.length > 0 ? <SectionHeader title="Possible triggers" /> : null}
      {increases.map((i) => {
        const kind = insightKind(i.key) as keyof typeof KIND_ICON;
        return (
          <Card key={i.key}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconCircle icon={KIND_ICON[kind]} color={C.flare} bg={C.flareSoft} size={44} />
              <View style={{ flex: 1 }}>
                <T size={17} weight="bold">
                  {insightLabel(i.key)}
                </T>
                <T size={12} color={C.muted}>
                  {kind} · seen on {i.exposedDays} days
                </T>
              </View>
              <Pill text={i.confidence} color={CONF[i.confidence][0]} bg={CONF[i.confidence][1]} />
            </View>
            <P>{sentence(i)}</P>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Bar label="After it" value={i.flareRateWith} color={C.flare} />
              <Bar label="Without it" value={i.flareRateWithout} color={C.faint} />
            </View>
            {i.confidence !== 'Low' ? (
              <T size={13} color={C.primary}>
                To confirm: avoid it for 3 weeks, then add it back and watch.
              </T>
            ) : null}
          </Card>
        );
      })}

      {decreases.length > 0 ? <SectionHeader title="Linked with fewer flares" /> : null}
      {decreases.map((i) => (
        <Card key={i.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconCircle icon="shield-checkmark" color={C.good} bg={C.goodSoft} size={44} />
          <View style={{ flex: 1 }}>
            <T size={16} weight="semibold">
              {insightLabel(i.key)}
            </T>
            <T size={12} color={C.muted}>
              {sentence(i)}
            </T>
          </View>
        </Card>
      ))}

      <Card style={{ backgroundColor: C.warnSoft }}>
        <T size={13}>
          These are patterns in your own data, not proof. Things often happen together (a party means alcohol, late sleep
          and fried food). Discuss changes with your dermatologist and never stop prescribed treatment.
        </T>
      </Card>
      <Button title="How this works" kind="secondary" icon="information-circle-outline" onPress={() => router.push('/about')} />
    </Screen>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ height: 8, backgroundColor: C.bg, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
      <T size={11} color={C.muted}>
        {label}: {Math.round(value * 100)}% flares
      </T>
    </View>
  );
}
