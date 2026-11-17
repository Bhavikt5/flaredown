import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { pushPick, takePicks } from '@/lib/pickStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ALL_TAGS, allIngredients, ingredientInfo, Tag, TAG_LABELS } from '@/data/ingredients';
import { addMeal, currentMealType, getCustomDish, localDate, MealType, saveCustomDish, saveCustomIngredient } from '@/lib/db';
import { suggestIngredients } from '@/lib/gemini';
import { hasGemini } from '@/lib/config';
import { scoreTags } from '@/lib/score';
import { Gauge } from '@/components/charts';
import { Button, C, Card, Chip, ChipRow, H2, Input, P, Pill, Screen, T, tap } from '@/components/ui';

type Pending = { key: string; name: string; tags: Tag[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export default function NewDish() {
  // barcode/mode/date/meal are set when coming from a scan the database didn't know.
  const params = useLocalSearchParams<{ name?: string; barcode?: string; mode?: string; date?: string; meal?: MealType }>();
  const fromScan = !!params.barcode;
  const [name, setName] = useState(params.name ?? '');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [fried, setFried] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [form, setForm] = useState<Pending | null>(null); // new-ingredient editor
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    const nq = norm(q);
    return allIngredients()
      .filter(([id, ing]) => !picked.includes(id) && (!nq || norm(ing.name).includes(nq)))
      .slice(0, nq ? 30 : 18);
  }, [q, picked]);

  const exactMatch = allIngredients().some(([, i]) => norm(i.name) === norm(q));

  const tags: Tag[] = [
    ...picked.flatMap((id) => ingredientInfo(id)?.tags ?? []),
    ...pending.flatMap((p) => p.tags),
    ...(fried ? (['fried'] as Tag[]) : []),
  ];
  const score = picked.length || pending.length ? scoreTags(tags) : null;

  const fillWithAi = async () => {
    if (!name.trim()) return Alert.alert('Name needed', 'Type the dish or product name first.');
    setAiBusy(true);
    setAiNote(null);
    try {
      const s = await suggestIngredients(name.trim());
      if (!s.known.length && !s.newItems.length) {
        setAiNote('Gemini didn’t recognise this food. Add the ingredients yourself below.');
        return;
      }
      setPicked((p) => [...new Set([...p, ...s.known])]);
      setPending((p) => [
        ...p,
        ...s.newItems
          .filter((n) => !p.some((x) => x.name.toLowerCase() === n.name.toLowerCase()))
          .map((n, i) => ({ key: `ai_${Date.now()}_${i}`, name: n.name, tags: n.tags })),
      ]);
      if (s.fried) setFried(true);
      setAiNote(s.note ? `${s.note} Check the list below and fix anything wrong.` : 'Check the list below and fix anything wrong.');
    } catch (e) {
      Alert.alert('AI not available', e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  };

  const saveForm = () => {
    if (!form || !form.name.trim()) return;
    const exists = pending.some((p) => p.key === form.key);
    setPending(exists ? pending.map((p) => (p.key === form.key ? form : p)) : [...pending, form]);
    setForm(null);
    setQ('');
  };

  // A scanned packet chosen on the scan screen comes back here.
  useFocusEffect(
    useCallback(() => {
      const ids = takePicks();
      if (ids.length) setPicked((p) => [...new Set([...p, ...ids])]);
    }, []),
  );

  // Unknown barcode with a name: ask the AI straight away.
  const autoFilled = useRef(false);
  useEffect(() => {
    if (fromScan && params.name && hasGemini() && !autoFilled.current) {
      autoFilled.current = true;
      fillWithAi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name needed', 'Give the dish a name.');
    if (!picked.length && !pending.length) return Alert.alert('Add ingredients', 'Add at least one ingredient.');
    setSaving(true);
    try {
      const newIds: string[] = [];
      for (const p of pending) newIds.push(await saveCustomIngredient(p.name, p.tags));
      const ingredients = [...new Set([...picked, ...newIds])];

      if (fromScan && params.mode === 'ingredient') {
        // The packet becomes one ingredient carrying all its food groups.
        const productId = await saveCustomIngredient(name.trim(), [...new Set(tags)], `bc_${params.barcode}`);
        pushPick(productId);
        router.back();
        return;
      }

      const dishId = await saveCustomDish(name.trim(), ingredients, fried, fromScan ? `bcd_${params.barcode}` : undefined);
      if (fromScan) {
        const dish = await getCustomDish(dishId);
        if (dish) await addMeal(params.date ?? localDate(), params.meal ?? currentMealType(), dish);
        router.replace('/food');
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Card>
        <H2>Dish or product name</H2>
        <Input placeholder="e.g. Mom’s thalipeeth, Kurkure, Amul cheese slice" value={name} onChangeText={setName} />
        {hasGemini() ? (
          <Button
            title={aiBusy ? 'Asking AI…' : 'Fill ingredients with AI'}
            icon="sparkles"
            kind="secondary"
            onPress={fillWithAi}
            disabled={aiBusy || !name.trim()}
          />
        ) : null}
        {aiBusy ? <ActivityIndicator color={C.primary} /> : null}
        {aiNote ? (
          <T size={12} color={C.muted}>
            {aiNote}
          </T>
        ) : null}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <H2>Ingredients</H2>
          {!fromScan ? (
            <Pressable
              onPress={() => router.push({ pathname: '/scan', params: { mode: 'ingredient' } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              hitSlop={10}
            >
              <Ionicons name="barcode-outline" size={18} color={C.primary} />
              <T size={13} weight="semibold" color={C.primary}>
                Scan a packet
              </T>
            </Pressable>
          ) : null}
        </View>
        {picked.length || pending.length ? (
          <ChipRow>
            {picked.map((id) => (
              <Chip key={id} label={`✕ ${ingredientInfo(id)?.name ?? id}`} on onPress={() => setPicked(picked.filter((x) => x !== id))} />
            ))}
            {pending.map((p) => (
              <Chip key={p.key} label={`✎ ${p.name} (new)`} on color={C.good} onPress={() => setForm(p)} />
            ))}
          </ChipRow>
        ) : (
          <P muted>Search below and tap to add. Only main ingredients matter.</P>
        )}
        {pending.length ? (
          <T size={11} color={C.muted}>
            Green = your own ingredient. Tap it to edit or remove.
          </T>
        ) : null}

        <Input placeholder="Search ingredients" value={q} onChangeText={setQ} />
        <ChipRow>
          {options.map(([id, ing]) => (
            <Chip
              key={id}
              label={ing.custom ? `${ing.name} ★` : ing.name}
              on={false}
              onPress={() => {
                setPicked([...picked, id]);
                setQ('');
              }}
            />
          ))}
        </ChipRow>

        {q.trim().length > 1 && !exactMatch ? (
          <Pressable
            onPress={() => {
              tap();
              setForm({ key: `m_${Date.now()}`, name: q.trim(), tags: [] });
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
          >
            <Ionicons name="add-circle" size={22} color={C.good} />
            <T size={14} weight="semibold" color={C.good}>
              Add “{q.trim()}” as my own ingredient
            </T>
          </Pressable>
        ) : null}
      </Card>

      {form ? (
        <Card style={{ borderWidth: 2, borderColor: C.good }}>
          <H2>My own ingredient</H2>
          <Input value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Name, e.g. Schezwan sauce" />
          <T size={14} weight="medium">
            What does it contain? Tick all that apply.
          </T>
          <ChipRow>
            {ALL_TAGS.map((t) => (
              <Chip
                key={t}
                label={TAG_LABELS[t]}
                on={form.tags.includes(t)}
                color={C.good}
                onPress={() => setForm({ ...form, tags: form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t] })}
              />
            ))}
          </ChipRow>
          <T size={11} color={C.muted}>
            Packaged snacks, biscuits, sauces and instant foods are usually “Ultra-processed”. Not sure? Leave it blank.
          </T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Save ingredient" onPress={saveForm} disabled={!form.name.trim()} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={pending.some((p) => p.key === form.key) ? 'Remove' : 'Cancel'}
                kind="danger"
                onPress={() => {
                  setPending(pending.filter((p) => p.key !== form.key));
                  setForm(null);
                }}
              />
            </View>
          </View>
        </Card>
      ) : null}

      <Card>
        <ChipRow>
          <Chip label={fried ? '✓ Deep fried' : 'Deep fried?'} on={fried} onPress={() => setFried(!fried)} />
        </ChipRow>
      </Card>

      {score ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Gauge score={score.score} level={score.level} width={120} />
          <View style={{ flex: 1, gap: 6 }}>
            <T size={14} weight="semibold">
              Flare risk score
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {score.raises.map((r) => (
                <Pill key={r.tag} text={r.label} color={C.flare} bg={C.flareSoft} icon="arrow-up" />
              ))}
              {score.lowers.map((r) => (
                <Pill key={r.tag} text={r.label} color={C.good} bg={C.goodSoft} icon="arrow-down" />
              ))}
            </View>
          </View>
        </Card>
      ) : null}

      <Button
        title={
          saving
            ? 'Saving…'
            : fromScan && params.mode === 'ingredient'
              ? 'Add to my dish'
              : fromScan
                ? `Save and log to ${params.meal ?? currentMealType()}`
                : 'Save dish'
        }
        onPress={save}
        disabled={saving}
      />
    </Screen>
  );
}
