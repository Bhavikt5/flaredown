import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addMeal, currentMealType, localDate, MEAL_TYPES, MealType, saveCustomDish } from '@/lib/db';
import { detectDishes, DetectedDish } from '@/lib/gemini';
import { hasGemini } from '@/lib/config';
import { scoreDishes, scoreDish } from '@/lib/score';
import { Dish } from '@/data/dishes';
import { Gauge, LEVEL_COLORS } from '@/components/charts';
import { DishPicker } from '@/components/DishPicker';
import { Button, C, Card, Chip, ChipRow, IconCircle, P, Pill, Screen, T } from '@/components/ui';

const toDish = (d: DetectedDish, i: number): Dish => ({
  id: d.dishId ?? `ai_${i}`,
  name: d.name,
  alt: '',
  category: 'Custom',
  ingredients: d.ingredients,
  fried: d.fried,
});

export default function Snap() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedDish[] | null>(null);
  const [meal, setMeal] = useState<MealType>(currentMealType());
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'change'; index: number } | null>(null);

  const onPicked = (dish: Dish) => {
    if (!picker) return;
    const list = items ?? [];
    const entry: DetectedDish = {
      dishId: dish.id,
      name: dish.name,
      ingredients: dish.ingredients,
      fried: dish.fried,
      portion: picker.mode === 'change' ? list[picker.index]?.portion ?? '' : '',
      confidence: 1,
      seen: 'chosen by you',
    };
    setItems(picker.mode === 'change' ? list.map((d, j) => (j === picker.index ? entry : d)) : [...list, entry]);
    setPicker(null);
  };

  const pick = async (camera: boolean) => {
    if (camera) {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return Alert.alert('Camera blocked', 'Allow camera access in your phone settings.');
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5 };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const uri = res.assets[0].uri;
    setPhoto(uri);
    analyse(uri);
  };

  const analyse = async (uri: string) => {
    setItems(null);
    setError(null);
    setBusy(true);
    try {
      const out = await detectDishes(uri);
      if (out.notFood || out.dishes.length === 0) {
        setError('No food found in this photo. Try again closer to the plate, or search manually.');
      } else {
        setItems(out.dishes);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!items?.length) return;
    setSaving(true);
    try {
      const date = localDate();
      for (const d of items) {
        if (d.dishId) {
          await addMeal(date, meal, toDish(d, 0));
        } else {
          const ingredients = d.ingredients.length ? d.ingredients : [];
          const id = await saveCustomDish(d.name, ingredients, d.fried);
          await addMeal(date, meal, { ...toDish(d, 0), id });
        }
      }
      router.replace('/food');
    } finally {
      setSaving(false);
    }
  };

  if (!hasGemini()) {
    return (
      <Screen>
        <Card>
          <IconCircle icon="key" size={48} />
          <T size={18} weight="semibold">
            Add your free Gemini key
          </T>
          <P>1. Open aistudio.google.com on your laptop and sign in with Google.</P>
          <P>2. Click “Get API key” → “Create API key”.</P>
          <P>3. Paste it into the .env file in the project as EXPO_PUBLIC_GEMINI_API_KEY, then restart “npx expo start”.</P>
          <P muted>Until then, you can log food with search.</P>
        </Card>
        <Button title="Search food instead" onPress={() => router.replace({ pathname: '/add-food', params: { date: localDate(), meal: currentMealType() } })} />
      </Screen>
    );
  }

  const dishes = (items ?? []).map(toDish);
  const total = dishes.length ? scoreDishes(dishes) : null;

  return (
    <Screen>
      {!photo ? (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 14 }}>
            <IconCircle icon="camera" size={72} />
            <T size={20} weight="bold">
              Snap your meal
            </T>
            <P muted style={{ textAlign: 'center' }}>
              Take a photo from above with the whole plate in view. AI finds the dishes and shows the flare risk score.
            </P>
          </Card>
          <Button title="Take photo" icon="camera" onPress={() => pick(true)} />
          <Button title="Choose from gallery" icon="images-outline" kind="secondary" onPress={() => pick(false)} />
        </>
      ) : (
        <>
          <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 22 }} contentFit="cover" />
          {busy ? (
            <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
              <ActivityIndicator color={C.primary} size="large" />
              <T size={15} weight="medium">
                Finding dishes…
              </T>
              <T size={12} color={C.muted}>
                If Gemini is busy, the app retries automatically
              </T>
            </Card>
          ) : null}
          {error ? (
            <Card style={{ backgroundColor: C.flareSoft }}>
              <P>{error}</P>
              <Button title="Retry this photo" icon="refresh" onPress={() => analyse(photo)} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button title="New photo" icon="camera-outline" kind="secondary" onPress={() => pick(true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Search"
                    icon="search"
                    kind="secondary"
                    onPress={() => router.replace({ pathname: '/add-food', params: { date: localDate(), meal } })}
                  />
                </View>
              </View>
            </Card>
          ) : null}
          {items && total ? (
            <>
              <Card style={{ alignItems: 'center' }}>
                <T size={13} weight="medium" color={C.muted}>
                  Meal flare risk score
                </T>
                <Gauge score={total.score} level={total.level} width={200} />
                {total.raises.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {total.raises.map((r) => (
                      <Pill key={r.tag} text={`${r.label} +${r.weight}`} color={C.flare} bg={C.flareSoft} icon="arrow-up" />
                    ))}
                    {total.lowers.map((r) => (
                      <Pill key={r.tag} text={`${r.label} ${r.weight}`} color={C.good} bg={C.goodSoft} icon="arrow-down" />
                    ))}
                  </View>
                ) : null}
                <T size={11} color={C.muted} style={{ textAlign: 'center' }}>
                  General score from published research, not personal to you. Your own triggers appear in Insights.
                </T>
              </Card>

              <T size={12} color={C.muted}>
                Wrong dish? Tap it to change.
              </T>
              {items.map((d, i) => {
                const sc = scoreDish(toDish(d, i));
                const [fg, bg] = LEVEL_COLORS[sc.level];
                return (
                  <Card
                    key={i}
                    onPress={() => setPicker({ mode: 'change', index: i })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <T size={16} weight="semibold">
                        {d.name}
                      </T>
                      <T size={12} color={d.confidence < 0.6 ? C.warn : C.muted}>
                        {d.portion}
                        {d.dishId ? '' : ' · new dish'}
                        {d.confidence < 0.6 ? ' · not sure, please check' : ''}
                      </T>
                    </View>
                    <Pill text={sc.score.toFixed(1)} color={fg} bg={bg} />
                    <Ionicons name="swap-horizontal" size={18} color={C.primary} />
                    <Pressable onPress={() => setItems(items.filter((_, j) => j !== i))} hitSlop={10}>
                      <Ionicons name="close-circle" size={22} color={C.faint} />
                    </Pressable>
                  </Card>
                );
              })}
              <Button title="Add a missing item" icon="add" kind="secondary" onPress={() => setPicker({ mode: 'add' })} />

              <Card>
                <T size={15} weight="semibold">
                  Which meal?
                </T>
                <ChipRow>
                  {MEAL_TYPES.map((m) => (
                    <Chip key={m} label={m} on={m === meal} onPress={() => setMeal(m)} />
                  ))}
                </ChipRow>
              </Card>

              <Button title={saving ? 'Saving…' : `Log ${items.length} item${items.length === 1 ? '' : 's'}`} onPress={save} disabled={saving || items.length === 0} />
              <Button title="Retake photo" kind="secondary" icon="camera-outline" onPress={() => pick(true)} />
            </>
          ) : null}
        </>
      )}
      <DishPicker
        visible={picker != null}
        title={picker?.mode === 'change' ? 'Change dish' : 'Add an item'}
        onPick={onPicked}
        onClose={() => setPicker(null)}
      />
      <T size={11} color={C.muted} style={{ textAlign: 'center' }}>
        Meal photos are sent to Google Gemini and not saved in the app. On Gemini’s free tier, Google may use them to
        improve its products, so only photograph food.
      </T>
    </Screen>
  );
}
