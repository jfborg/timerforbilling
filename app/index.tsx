import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { getStationery } from '../constants/stationery';
import { useComposeStore } from '../store/useComposeStore';

export default function HomeScreen() {
  const router = useRouter();
  const stationery = getStationery('classic-cream');
  const startFresh = useComposeStore((s) => s.startFresh);

  const goCompose = () => {
    startFresh();
    router.push('/compose');
  };

  return (
    <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
      <Text style={[styles.title, { color: stationery.textColor, fontFamily: 'Georgia' }]}>Sealed</Text>

      <Text onPress={goCompose} style={[styles.primaryButton, { backgroundColor: stationery.accentColor }]}>
        Write a letter
      </Text>
      <Link href="/claim" style={[styles.secondaryLink, { color: stationery.accentColor }]}>
        Have a letter? Enter your code
      </Link>
      <Link href="/shelf" style={[styles.secondaryLink, { color: stationery.mutedTextColor }]}>
        Your shelf
      </Link>

      <Link href="/debug" style={[styles.devLink, { color: stationery.mutedTextColor }]}>
        Debug screen
      </Link>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '600',
    marginBottom: 12,
  },
  primaryButton: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  secondaryLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  devLink: {
    marginTop: 32,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
