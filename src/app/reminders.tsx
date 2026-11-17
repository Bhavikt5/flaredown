import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { getReminders, Reminder, saveReminders } from '@/lib/services';
import { Button, C, Card, Chip, ChipRow, H2, P, Screen, Stepper } from '@/components/ui';

export default function Reminders() {
  const [list, setList] = useState<Reminder[] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getReminders().then(setList);
  }, []);

  if (!list) return null;

  const patch = (id: string, p: Partial<Reminder>) => {
    setList(list.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setSaved(false);
  };

  const save = async () => {
    const ok = await saveReminders(list);
    if (!ok) Alert.alert('Notifications blocked', 'Allow notifications for this app in your phone settings.');
    else setSaved(true);
  };

  const fmt = (h: number, m: number) => `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;

  return (
    <Screen>
      <P muted>Reminders are scheduled on your phone. On some phones they can arrive a few minutes late.</P>
      {list.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <H2>{r.label}</H2>
            <ChipRow>
              <Chip label={r.on ? 'On' : 'Off'} on={r.on} onPress={() => patch(r.id, { on: !r.on })} />
            </ChipRow>
          </View>
          {r.on && (
            <>
              <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary, textAlign: 'center' }}>{fmt(r.hour, r.minute)}</Text>
              <Stepper label="Hour" value={r.hour} min={0} max={23} unit="" onChange={(v) => patch(r.id, { hour: v })} />
              <Stepper label="Minute" value={r.minute} step={15} min={0} max={45} unit="" onChange={(v) => patch(r.id, { minute: v })} />
            </>
          )}
        </Card>
      ))}
      <Button title={saved ? 'Saved ✓' : 'Save reminders'} onPress={save} />
    </Screen>
  );
}
