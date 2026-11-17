import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays, localDate, prettyDate } from '@/lib/db';
import { C, T, tap } from './ui';

/** Week strip like the reference's appointment slots, plus previous/next week. */
export function DateBar({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = localDate();
  // Show the 7 days ending on the later of (selected date + 3) or today-bound.
  let end = addDays(date, 3);
  if (end > today) end = today;
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
  const label = (d: string) => {
    const [y, m, dd] = d.split('-').map(Number);
    const dt = new Date(y, m - 1, dd);
    return { wd: dt.toLocaleDateString('en-IN', { weekday: 'short' }), day: dd };
  };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T size={14} weight="medium" color={C.muted}>
          {date === today ? 'Today' : prettyDate(date)}
        </T>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Pressable onPress={() => onChange(addDays(date, -7))} hitSlop={10} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={20} color={C.primary} />
          </Pressable>
          <Pressable
            onPress={() => date !== today && onChange(addDays(date, 7) > today ? today : addDays(date, 7))}
            hitSlop={10}
            style={{ padding: 4, opacity: date === today ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-forward" size={20} color={C.primary} />
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((d) => {
          const on = d === date;
          const { wd, day } = label(d);
          return (
            <Pressable
              key={d}
              onPress={() => {
                tap();
                onChange(d);
              }}
              style={{
                width: 44,
                paddingVertical: 10,
                borderRadius: 16,
                alignItems: 'center',
                gap: 4,
                backgroundColor: on ? C.primary : 'transparent',
              }}
            >
              <T size={12} color={on ? 'rgba(255,255,255,0.85)' : C.muted}>
                {wd}
              </T>
              <T size={17} weight="semibold" color={on ? '#fff' : C.text}>
                {day}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
