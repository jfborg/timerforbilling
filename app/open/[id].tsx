import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';

import { getLetter, hasReply, openLetter, type LetterRow } from '../../lib/api';
import { getStationery } from '../../constants/stationery';
import { useAuthStore } from '../../store/useAuthStore';
import { useComposeStore } from '../../store/useComposeStore';

type ViewState = 'loading' | 'not_found' | 'locked' | 'ready_to_open' | 'opening' | 'opened' | 'error';

export default function OpenLetterScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stationery = getStationery('classic-cream');
  const userId = useAuthStore((s) => s.userId);
  const ensureSignedIn = useAuthStore((s) => s.ensureSignedIn);
  const startReply = useComposeStore((s) => s.startReply);

  const [state, setState] = useState<ViewState>('loading');
  const [letter, setLetter] = useState<LetterRow | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [alreadyReplied, setAlreadyReplied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [now, setNow] = useState(() => Date.now());
  // Animated.Value's ref-backed nature makes this an idiomatic, safe exception to the
  // ref-during-render rule (same reasoning as app/seal.tsx): the value is created once and
  // driven outside React's render cycle.
  // eslint-disable-next-line react-hooks/refs
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const revealBody = async () => {
    if (!id) return;
    try {
      const result = await openLetter(id);
      setBodyText(result.bodyText);
      setState('opened');
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      const replied = await hasReply(id).catch(() => false);
      setAlreadyReplied(replied);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const signedInUserId = await ensureSignedIn();
      if (cancelled) return;
      if (!signedInUserId) {
        setErrorMessage('Could not sign in. Check your connection and try again.');
        setState('error');
        return;
      }
      if (!id) return;
      try {
        const row = await getLetter(id);
        if (cancelled) return;
        if (!row || row.status === 'burned') {
          setState('not_found');
          return;
        }
        setLetter(row);
        const unlocked = Date.now() >= new Date(row.unlock_at).getTime();
        setState(unlocked ? (row.opened_at ? 'opened' : 'ready_to_open') : 'locked');
        if (row.opened_at) await revealBody();
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : String(err));
          setState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const breakSeal = async () => {
    setState('opening');
    await revealBody();
  };

  const writeBack = () => {
    if (!letter) return;
    startReply(letter.id, letter.sender_display_name);
    router.push('/compose');
  };

  const report = () => {
    Alert.alert('Report', 'Reporting is coming in a later phase.');
  };

  if (state === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
        <Text style={{ color: stationery.mutedTextColor }}>Loading...</Text>
      </View>
    );
  }

  if (state === 'not_found') {
    return (
      <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
        <Text style={{ color: stationery.textColor }}>This letter is gone.</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
        <Text style={styles.error}>{errorMessage}</Text>
      </View>
    );
  }

  if (state === 'locked' && letter) {
    return (
      <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
        <View style={[styles.wax, { backgroundColor: stationery.accentColor }]}>
          <Text style={styles.waxLetter}>S</Text>
        </View>
        <Text style={[styles.from, { color: stationery.mutedTextColor }]}>From {letter.sender_display_name}</Text>
        <Text style={[styles.countdown, { color: stationery.accentColor }]}>
          {formatCountdown(new Date(letter.unlock_at).getTime() - now)}
        </Text>
      </View>
    );
  }

  if ((state === 'ready_to_open' || state === 'opening') && letter) {
    return (
      <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
        <Text style={[styles.from, { color: stationery.mutedTextColor }]}>From {letter.sender_display_name}</Text>
        <Text
          onPress={state === 'ready_to_open' ? breakSeal : undefined}
          style={[styles.wax, styles.pressableWax, { backgroundColor: stationery.accentColor }]}
        >
          <Text style={styles.waxLetter}>{state === 'opening' ? '...' : 'S'}</Text>
        </Text>
        <Text style={[styles.hint, { color: stationery.mutedTextColor }]}>
          {state === 'opening' ? 'Breaking the seal...' : 'Tap to break the seal'}
        </Text>
      </View>
    );
  }

  if (state === 'opened' && letter) {
    const isRecipient = letter.recipient_id === userId;
    return (
      <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
        <Text style={[styles.from, { color: stationery.mutedTextColor }]}>From {letter.sender_display_name}</Text>
        <Animated.View style={[styles.letterCard, { backgroundColor: stationery.cardColor, borderColor: stationery.borderColor, opacity: fade }]}>
          <Text style={[styles.bodyText, { color: stationery.textColor }]}>{bodyText}</Text>
        </Animated.View>
        <View style={styles.actions}>
          {isRecipient && !alreadyReplied && (
            <Text onPress={writeBack} style={[styles.primaryButton, { backgroundColor: stationery.accentColor }]}>
              Write back
            </Text>
          )}
          <Text onPress={() => router.replace('/shelf')} style={[styles.secondaryButton, { color: stationery.mutedTextColor }]}>
            Keep
          </Text>
          <Text onPress={report} style={[styles.secondaryButton, { color: stationery.mutedTextColor }]}>
            Report
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'Opening now';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  parts.push(`${String(hours).padStart(2, '0')}h`);
  parts.push(`${String(minutes).padStart(2, '0')}m`);
  parts.push(`${String(seconds).padStart(2, '0')}s`);
  return parts.join(' ');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  from: {
    fontSize: 14,
  },
  wax: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  pressableWax: {
    overflow: 'hidden',
  },
  waxLetter: {
    color: '#F3E9D6',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 90,
    textAlign: 'center',
    width: 90,
  },
  countdown: {
    fontSize: 26,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
  },
  letterCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  bodyText: {
    fontSize: 17,
    lineHeight: 26,
    fontFamily: 'Georgia',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    color: '#fff',
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  secondaryButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#B00020',
  },
});
