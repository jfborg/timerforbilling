import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { getStationery } from '../constants/stationery';

// Shown after a reply, not a fresh letter: no share step, since reply_to_letter() already
// auto-addressed and auto-claimed it to the original sender.
export default function SentScreen() {
  const router = useRouter();
  const { unlockAt } = useLocalSearchParams<{ unlockAt: string }>();
  const stationery = getStationery('classic-cream');
  const unlockDate = unlockAt ? new Date(unlockAt) : null;

  return (
    <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
      <View style={[styles.wax, { backgroundColor: stationery.accentColor }]}>
        <Text style={styles.waxLetter}>S</Text>
      </View>
      <Text style={[styles.title, { color: stationery.textColor }]}>Your reply is sealed</Text>
      <Text style={[styles.subtitle, { color: stationery.mutedTextColor }]}>
        {unlockDate
          ? `It lands on their shelf and opens ${unlockDate.toLocaleString()}.`
          : 'It is on its way.'}
      </Text>
      <Text onPress={() => router.replace('/shelf')} style={[styles.done, { color: stationery.accentColor }]}>
        Back to shelf
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  wax: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waxLetter: {
    color: '#F3E9D6',
    fontSize: 26,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  done: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
