import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Checkin,
  addDays,
  getCheckin,
  getLatestCheckinBefore,
  listTreatments,
  localDate,
  saveCheckin,
  Treatment,
} from '@/lib/db';
import { BODY_AREAS } from '@/data/body';
import { DateBar } from '@/components/DateBar';
import { Button, C, Card, Chip, ChipRow, H2, Input, P, Pill, Score, Screen, Stepper, T } from '@/components/ui';

type Form = Omit<Checkin, 'id' | 'date'>;

const EMPTY: Form = {
  skin: 3,
  itch: 3,
  stress: 3,
  sleepHours: 7,
  alcoholUnits: 0,
  flare: false,
  areas: [],
  treatments: [],
  notes: '',
};

export default function CheckinScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState(params.date ?? localDate());
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const load = useCallback(async (d: string) => {
    const existing = await getCheckin(d);
    if (existing) {
      const { id: _id, date: _d, ...rest } = existing;
      setForm(rest);
      setSaved(true);
    } else {
      const prev = await getLatestCheckinBefore(d);
      setForm({ ...EMPTY, sleepHours: prev?.sleepHours ?? 7, areas: prev?.areas ?? [] });
      setSaved(false);
    }
    setTreatments((await listTreatments()).filter((t) => t.active));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(date);
    }, [date, load]),
  );

  const update = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };

  const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const copyYesterday = async () => {
    const prev = await getCheckin(addDays(date, -1));
    if (!prev) return Alert.alert('No check-in yesterday', 'There is nothing to copy from the day before.');
    const { id: _id, date: _d, ...rest } = prev;
    setForm({ ...rest, notes: '' });
    setSaved(false);
  };

  const save = async () => {
    await saveCheckin({ date, ...form });
    setSaved(true);
    if (date === localDate()) router.back();
  };

  return (
    <Screen>
      <DateBar date={date} onChange={setDate} />
      {saved ? <Pill text="Saved for this day" color={C.good} bg={C.goodSoft} icon="checkmark" /> : null}

      <Card>
        <H2>Skin</H2>
        <Score label="Overall skin" value={form.skin} onChange={(v) => update({ skin: v })} low="Clear" high="Worst ever" />
        <Score label="Itch" value={form.itch} onChange={(v) => update({ itch: v })} low="None" high="Unbearable" />
        <ChipRow>
          <Chip
            label={form.flare ? '✓ This is a flare' : 'Mark as flare'}
            on={form.flare}
            color={C.flare}
            onPress={() => update({ flare: !form.flare })}
          />
        </ChipRow>
      </Card>

      <Card>
        <H2>Affected areas</H2>
        <ChipRow>
          {BODY_AREAS.map((a) => (
            <Chip key={a} label={a} on={form.areas.includes(a)} onPress={() => update({ areas: toggle(form.areas, a) })} />
          ))}
        </ChipRow>
      </Card>

      <Card>
        <H2>Lifestyle</H2>
        <Score label="Stress" value={form.stress} onChange={(v) => update({ stress: v })} low="Calm" high="Very stressed" />
        <Stepper icon="moon" label="Sleep" value={form.sleepHours} step={0.5} max={14} unit="h" onChange={(v) => update({ sleepHours: v })} />
        <Stepper icon="wine" label="Alcohol" value={form.alcoholUnits} max={20} unit="drinks" onChange={(v) => update({ alcoholUnits: v })} />
      </Card>

      <Card>
        <H2>Treatments used</H2>
        {treatments.length === 0 ? (
          <P muted>Add your creams, tablets or injections in Profile → My treatments.</P>
        ) : (
          <ChipRow>
            {treatments.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                on={form.treatments.includes(t.id)}
                color={C.good}
                onPress={() => update({ treatments: toggle(form.treatments, t.id) })}
              />
            ))}
          </ChipRow>
        )}
      </Card>

      <Card>
        <H2>Notes</H2>
        <Input
          placeholder="Anything unusual? Cold, new medicine, travel, festival, period…"
          value={form.notes}
          onChangeText={(t) => update({ notes: t })}
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
      </Card>

      <View style={{ gap: 10 }}>
        <Button title={saved ? 'Saved ✓' : 'Save check-in'} onPress={save} />
        <Button title="Same as yesterday" kind="secondary" icon="copy-outline" onPress={copyYesterday} />
        <T size={12} color={C.muted} style={{ textAlign: 'center' }}>
          Not medical advice. Never change prescribed treatment because of this app.
        </T>
      </View>
    </Screen>
  );
}
