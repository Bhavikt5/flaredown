import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addTreatment, deleteTreatment, listTreatments, Treatment } from '@/lib/db';
import { TREATMENT_KINDS } from '@/data/body';
import { Button, C, Card, Chip, ChipRow, H2, Input, P, Screen } from '@/components/ui';

export default function Treatments() {
  const [list, setList] = useState<Treatment[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState(TREATMENT_KINDS[0]);

  const load = useCallback(async () => setList(await listTreatments()), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const add = async () => {
    if (!name.trim()) return;
    await addTreatment(name.trim(), kind);
    setName('');
    load();
  };

  const remove = (t: Treatment) =>
    Alert.alert('Remove', `Remove ${t.name}? Past check-ins keep their record.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => (await deleteTreatment(t.id), load()) },
    ]);

  return (
    <Screen>
      <P muted>Add what your doctor prescribed. Tick them in each daily check-in so the report shows how often you used them.</P>
      <Card>
        <H2>Add treatment</H2>
        <Input placeholder="Name, e.g. Clobetasol cream" value={name} onChangeText={setName} />
        <ChipRow>
          {TREATMENT_KINDS.map((k) => (
            <Chip key={k} label={k} on={k === kind} onPress={() => setKind(k)} />
          ))}
        </ChipRow>
        <Button title="Add" onPress={add} disabled={!name.trim()} />
      </Card>
      <Card>
        <H2>My treatments</H2>
        {list.length === 0 ? (
          <P muted>None yet.</P>
        ) : (
          list.map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: C.text }}>{t.name}</Text>
                <Text style={{ fontSize: 12, color: C.muted }}>{t.kind}</Text>
              </View>
              <Pressable onPress={() => remove(t)} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={C.muted} />
              </Pressable>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
