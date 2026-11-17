import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { addPhoto, deletePhotoRow, listPhotos, localDate, Photo, prettyDate, uuid } from '@/lib/db';
import { BODY_AREAS } from '@/data/body';
import { Button, C, Card, Chip, ChipRow, H2, P, Screen, T } from '@/components/ui';
import { syncSoon } from '@/lib/sync';

const photoDir = () => {
  const dir = new Directory(Paths.document, 'photos');
  dir.create({ idempotent: true, intermediates: true });
  return dir;
};

export default function PhotosScreen() {
  const [area, setArea] = useState(BODY_AREAS[8]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const { width } = useWindowDimensions();
  const { capture } = useLocalSearchParams<{ capture?: string }>();
  const opened = useRef(false);

  const load = useCallback(async () => setPhotos(await listPhotos()), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const take = async (fromCamera: boolean) => {
    if (fromCamera) {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return Alert.alert('Camera blocked', 'Allow camera access in your phone settings to take photos.');
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [3, 4] };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const dest = new File(photoDir(), `${uuid()}.jpg`);
    await new File(res.assets[0].uri).copy(dest);
    await addPhoto({ date: localDate(), area, uri: dest.uri, note: '' });
    syncSoon();
    load();
  };

  // Opened from the + button: go straight to the camera once.
  useEffect(() => {
    if (capture === '1' && !opened.current) {
      opened.current = true;
      take(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture]);

  const remove = (p: Photo) =>
    Alert.alert('Delete photo', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const f = new File(p.uri);
            if (f.exists) f.delete();
          } catch {}
          await deletePhotoRow(p.id);
          setCompare((c) => c.filter((x) => x !== p.id));
          load();
        },
      },
    ]);

  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));

  const thumb = (width - 32 - 16) / 3;
  const shown = photos.filter((p) => p.area === area);
  const pair = compare.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as Photo[];

  return (
    <Screen>
      <Card>
        <H2>Body area</H2>
        <ChipRow>
          {BODY_AREAS.map((a) => (
            <Chip key={a} label={a} on={a === area} onPress={() => setArea(a)} />
          ))}
        </ChipRow>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="Take photo" onPress={() => take(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="From gallery" kind="secondary" onPress={() => take(false)} />
          </View>
        </View>
        <P muted>Tip: same room, same light, same distance each time. Photos stay inside the app, not your gallery.</P>
      </Card>

      {pair.length === 2 && (
        <Card>
          <H2>Compare</H2>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {pair
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((p) => (
                <View key={p.id} style={{ flex: 1, gap: 4 }}>
                  <Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 8 }} contentFit="cover" />
                  <T size={12} color={C.muted} style={{ textAlign: 'center' }}>{prettyDate(p.date)}</T>
                </View>
              ))}
          </View>
          <Button title="Close compare" kind="secondary" onPress={() => setCompare([])} />
        </Card>
      )}

      <Card>
        <H2>
          {area} ({shown.length})
        </H2>
        {shown.length === 0 ? (
          <P muted>No photos of this area yet.</P>
        ) : (
          <>
            <P muted>Tap two photos to compare. Long-press to delete.</P>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {shown.map((p) => {
                const sel = compare.includes(p.id);
                return (
                  <Pressable key={p.id} onPress={() => toggleCompare(p.id)} onLongPress={() => remove(p)}>
                    <Image
                      source={{ uri: p.uri }}
                      style={{
                        width: thumb,
                        height: (thumb * 4) / 3,
                        borderRadius: 8,
                        borderWidth: sel ? 3 : 0,
                        borderColor: C.primary,
                      }}
                      contentFit="cover"
                    />
                    <T size={11} color={C.muted} style={{ textAlign: 'center', marginTop: 2 }}>{prettyDate(p.date)}</T>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </Card>
    </Screen>
  );
}
