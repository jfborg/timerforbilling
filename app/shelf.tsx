import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { listMyLetters, type LetterRow } from '../lib/api';
import { getStationery } from '../constants/stationery';
import { useAuthStore } from '../store/useAuthStore';

export default function ShelfScreen() {
  const router = useRouter();
  const stationery = getStationery('classic-cream');
  const userId = useAuthStore((s) => s.userId);
  const authStatus = useAuthStore((s) => s.status);
  const authError = useAuthStore((s) => s.error);
  const ensureSignedIn = useAuthStore((s) => s.ensureSignedIn);

  useEffect(() => {
    ensureSignedIn();
  }, [ensureSignedIn]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['letters', userId],
    queryFn: listMyLetters,
    enabled: !!userId,
    refetchInterval: 30_000,
  });

  const received = (data ?? []).filter((l) => l.recipient_id === userId);

  return (
    <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
      <Text style={[styles.title, { color: stationery.textColor }]}>Your shelf</Text>

      {!userId && authStatus !== 'error' && (
        <Text style={[styles.hint, { color: stationery.mutedTextColor }]}>Signing in...</Text>
      )}
      {authStatus === 'error' && (
        <View>
          <Text style={styles.error}>Could not sign in{authError ? `: ${authError}` : '.'}</Text>
          <Text onPress={() => ensureSignedIn()} style={[styles.retry, { color: stationery.accentColor }]}>
            Retry
          </Text>
        </View>
      )}
      {userId && isLoading && <Text style={[styles.hint, { color: stationery.mutedTextColor }]}>Loading...</Text>}
      {error && <Text style={styles.error}>{error instanceof Error ? error.message : String(error)}</Text>}
      {userId && !isLoading && received.length === 0 && (
        <Text style={[styles.hint, { color: stationery.mutedTextColor }]}>
          Nothing here yet. Claim a letter to see it on your shelf.
        </Text>
      )}

      <FlatList
        data={received}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ShelfItem letter={item} stationery={stationery} onPress={() => router.push(`/open/${item.id}`)} />}
      />
    </View>
  );
}

function ShelfItem({
  letter,
  stationery,
  onPress,
}: {
  letter: LetterRow;
  stationery: ReturnType<typeof getStationery>;
  onPress: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const unlockAt = new Date(letter.unlock_at).getTime();
  const unlocked = now >= unlockAt;
  const label = letter.status === 'opened' ? 'Opened' : unlocked ? 'Tap to open' : formatCountdown(unlockAt - now);

  return (
    <Text
      onPress={onPress}
      style={[styles.item, { backgroundColor: stationery.cardColor, borderColor: stationery.borderColor }]}
    >
      <Text style={[styles.itemFrom, { color: stationery.textColor }]}>{letter.sender_display_name}</Text>
      {'\n'}
      <Text style={[styles.itemStatus, { color: unlocked ? stationery.accentColor : stationery.mutedTextColor }]}>
        {label}
      </Text>
    </Text>
  );
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'Opening now';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  hint: {
    fontSize: 14,
  },
  error: {
    color: '#B00020',
    fontSize: 13,
  },
  retry: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  list: {
    gap: 10,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  itemFrom: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemStatus: {
    fontSize: 13,
  },
});
