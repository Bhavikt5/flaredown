import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addMeal, currentMealType, getCustomDish, localDate, MEAL_TYPES, MealType, saveCustomDish, saveCustomIngredient } from '@/lib/db';
import { lookupBarcode } from '@/lib/openFoodFacts';
import { pushPick } from '@/lib/pickStore';
import { scoreTags } from '@/lib/score';
import { dishTags } from '@/data/dishes';
import { ALL_TAGS, ingredientInfo, Tag, TAG_LABELS } from '@/data/ingredients';
import { Gauge } from '@/components/charts';
import { Button, C, Card, Chip, ChipRow, H2, IconCircle, Input, P, Pill, Screen, T, tap } from '@/components/ui';

type Product = {
  code: string;
  name: string;
  imageUrl: string | null;
  tags: Tag[];
  reasons: Partial<Record<Tag, string>>;
  ingredients: string[];
  nova: number | null;
  source: 'saved' | 'off';
};

type State =
  | { kind: 'scan' }
  | { kind: 'loading'; code: string }
  | { kind: 'result'; product: Product }
  | { kind: 'notfound'; code: string }
  | { kind: 'error'; message: string };

export default function Scan() {
  const params = useLocalSearchParams<{ mode?: string; date?: string; meal?: MealType }>();
  const mode = params.mode === 'ingredient' ? 'ingredient' : 'log';
  const [perm, requestPerm] = useCameraPermissions();
  const [state, setState] = useState<State>({ kind: 'scan' });
  const [tags, setTags] = useState<Tag[]>([]);
  const [meal, setMeal] = useState<MealType>(params.meal ?? currentMealType());
  const [manual, setManual] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);

  const lookup = async (raw: string) => {
    const code = raw.replace(/\D/g, '');
    if (code.length < 8) return;
    tap();
    setState({ kind: 'loading', code });
    try {
      // Scanned before? Use the saved version (works offline, keeps your edits).
      const saved = await getCustomDish(`bcd_${code}`);
      if (saved) {
        const t = dishTags(saved);
        setTags(t);
        setState({
          kind: 'result',
          product: { code, name: saved.name, imageUrl: null, tags: t, reasons: {}, ingredients: saved.ingredients.filter((i) => i !== `bc_${code}`), nova: null, source: 'saved' },
        });
        return;
      }
      const r = await lookupBarcode(code);
      if (!r.found) {
        setState({ kind: 'notfound', code });
        return;
      }
      const p = r.product;
      setTags(p.tags);
      setState({ kind: 'result', product: { ...p, source: 'off' } });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Could not look up the product. Check your internet.' });
    }
  };

  const reset = () => {
    locked.current = false;
    setManual('');
    setNewName('');
    setState({ kind: 'scan' });
  };

  const save = async (p: Product) => {
    setSaving(true);
    try {
      const productId = await saveCustomIngredient(p.name, tags, `bc_${p.code}`);
      if (mode === 'ingredient') {
        pushPick(productId);
        router.back();
        return;
      }
      // Keep label ingredients only if they don't bring back a tag you removed.
      const label = p.ingredients.filter((id) => (ingredientInfo(id)?.tags ?? []).every((t) => tags.includes(t)));
      const fried = tags.includes('fried');
      const dishId = await saveCustomDish(p.name, [productId, ...label], fried, `bcd_${p.code}`);
      const dish = await getCustomDish(dishId);
      if (dish) await addMeal(params.date ?? localDate(), meal, dish);
      router.replace('/food');
    } finally {
      setSaving(false);
    }
  };

  // ---------- camera ----------
  if (state.kind === 'scan' || state.kind === 'loading') {
    if (!perm) return <ActivityIndicator style={{ marginTop: 80 }} color={C.primary} />;
    if (!perm.granted) {
      return (
        <Screen>
          <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }}>
            <IconCircle icon="barcode-outline" size={64} />
            <T size={18} weight="bold">
              Camera needed to scan
            </T>
            <P muted style={{ textAlign: 'center' }}>
              Point the camera at the barcode on any food packet to see its flare risk score.
            </P>
            <Button title="Allow camera" onPress={requestPerm} />
          </Card>
        </Screen>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={
            state.kind === 'scan'
              ? ({ data }) => {
                  if (locked.current) return;
                  locked.current = true;
                  lookup(data);
                }
              : undefined
          }
        />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 280, height: 170, borderRadius: 24, borderWidth: 3, borderColor: '#fff' }} />
          <View style={{ marginTop: 18, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 }}>
            <T size={14} weight="medium" color="#fff">
              {state.kind === 'loading' ? `Looking up ${state.code}…` : 'Point at the barcode on the packet'}
            </T>
          </View>
          {state.kind === 'loading' ? <ActivityIndicator color="#fff" style={{ marginTop: 14 }} /> : null}
        </View>
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 36, flexDirection: 'row', gap: 8 }}>
          <Input
            placeholder="Or type the barcode number"
            value={manual}
            onChangeText={setManual}
            keyboardType="number-pad"
            style={{ flex: 1 }}
            onSubmitEditing={() => lookup(manual)}
          />
          <Pressable
            onPress={() => lookup(manual)}
            style={{ width: 52, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="search" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  // ---------- not found ----------
  if (state.kind === 'notfound') {
    return (
      <Screen>
        <Card style={{ gap: 10 }}>
          <IconCircle icon="help-circle-outline" color={C.warn} bg={C.warnSoft} size={52} />
          <T size={18} weight="bold">
            Not in the food database yet
          </T>
          <P muted>
            Barcode {state.code} isn’t in Open Food Facts. Type the product name and the app will fill in its ingredients (with
            AI if set up). Next time you scan it, it’s recognised instantly.
          </P>
          <Input placeholder="Product name, e.g. Haldiram Aloo Bhujia" value={newName} onChangeText={setNewName} autoFocus />
          <Button
            title="Continue"
            icon="arrow-forward"
            disabled={!newName.trim()}
            onPress={() =>
              router.replace({
                pathname: '/new-dish',
                params: { name: newName.trim(), barcode: state.code, mode, date: params.date ?? localDate(), meal },
              })
            }
          />
        </Card>
        <Button title="Scan again" kind="secondary" icon="barcode-outline" onPress={reset} />
      </Screen>
    );
  }

  if (state.kind === 'error') {
    return (
      <Screen>
        <Card style={{ backgroundColor: C.flareSoft }}>
          <P>{state.message}</P>
        </Card>
        <Button title="Scan again" icon="barcode-outline" onPress={reset} />
      </Screen>
    );
  }

  // ---------- result ----------
  const p = state.product;
  const score = scoreTags(tags);
  return (
    <Screen>
      <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        {p.imageUrl ? (
          <Image source={{ uri: p.imageUrl }} style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: C.bg }} contentFit="contain" />
        ) : (
          <IconCircle icon="cube-outline" size={64} />
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <T size={17} weight="bold">
            {p.name}
          </T>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {p.nova === 4 ? <Pill text="Ultra-processed" color={C.flare} bg={C.flareSoft} /> : null}
            <Pill text={p.source === 'saved' ? 'Scanned before' : 'Open Food Facts'} color={C.muted} bg={C.bg} />
          </View>
        </View>
      </Card>

      <Card style={{ alignItems: 'center' }}>
        <T size={13} weight="medium" color={C.muted}>
          Flare risk score
        </T>
        <Gauge score={score.score} level={score.level} width={190} />
        <T size={11} color={C.muted} style={{ textAlign: 'center' }}>
          General score from published research, based on the packet’s ingredients.
        </T>
      </Card>

      <Card>
        <H2>Why</H2>
        {tags.length === 0 ? <P muted>No risk factors found on the label.</P> : null}
        {tags.map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: score.lowers.some((l) => l.tag === t) ? C.good : C.flare }} />
            <T size={14} weight="medium" style={{ flex: 1 }}>
              {TAG_LABELS[t]}
            </T>
            <T size={12} color={C.muted}>
              {p.reasons[t] ?? ''}
            </T>
          </View>
        ))}
      </Card>

      <Card>
        <H2>Correct if needed</H2>
        <T size={12} color={C.muted}>
          Labels are filled in by volunteers and can be incomplete. Tap to add or remove.
        </T>
        <ChipRow>
          {ALL_TAGS.map((t) => (
            <Chip
              key={t}
              label={TAG_LABELS[t]}
              on={tags.includes(t)}
              onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}
            />
          ))}
        </ChipRow>
      </Card>

      {mode === 'log' ? (
        <Card>
          <H2>Log to</H2>
          <ChipRow>
            {MEAL_TYPES.map((m) => (
              <Chip key={m} label={m} on={m === meal} onPress={() => setMeal(m)} />
            ))}
          </ChipRow>
        </Card>
      ) : null}

      <Button
        title={saving ? 'Saving…' : mode === 'log' ? `Log to ${meal}` : 'Add to my dish'}
        onPress={() => save(p)}
        disabled={saving}
      />
      <Button title="Scan another" kind="secondary" icon="barcode-outline" onPress={reset} />
      <T size={11} color={C.muted} style={{ textAlign: 'center' }}>
        Product data from Open Food Facts (openfoodfacts.org), shared under the Open Database License.
      </T>
    </Screen>
  );
}
