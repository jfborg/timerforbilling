import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import BRAND from '../constants/brand.json';
import { useScaffoldStore } from '../store/useScaffoldStore';

export default function HomeScreen() {
  const pingCount = useScaffoldStore((state) => state.pingCount);
  const ping = useScaffoldStore((state) => state.ping);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{BRAND.displayName}</Text>
      <Text style={styles.subtitle}>Phase 1: locked letter backend is running.</Text>
      <Text onPress={ping} style={styles.ping}>
        Zustand ping count: {pingCount} (tap to increment)
      </Text>
      <Link href="/debug" style={styles.link}>
        Open debug screen
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
    backgroundColor: '#FBF7F0',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
  },
  ping: {
    marginTop: 24,
    fontSize: 14,
    color: '#7A5B2E',
  },
  link: {
    marginTop: 12,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
