import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { replyToLetter, sealLetter } from '../lib/api';
import { getStationery } from '../constants/stationery';
import { useAuthStore } from '../store/useAuthStore';
import { useComposeStore } from '../store/useComposeStore';

const HOLD_DURATION_MS = 900;

export default function SealScreen() {
  const router = useRouter();
  const draft = useComposeStore();
  const stationery = getStationery(draft.stationeryId);
  const ensureSignedIn = useAuthStore((s) => s.ensureSignedIn);

  const [sealed, setSealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const startHold = () => {
    if (sealed || submitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: false,
    }).start();
    holdTimer.current = setTimeout(() => {
      completeSeal();
    }, HOLD_DURATION_MS);
  };

  const completeSeal = async () => {
    setSealed(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSubmitting(true);
    setError(null);

    const userId = await ensureSignedIn();
    if (!userId || !draft.unlockAt) {
      setError('Could not sign in. Check your connection and try again.');
      setSubmitting(false);
      setSealed(false);
      return;
    }

    try {
      if (draft.replyToLetterId) {
        const result = await replyToLetter({
          originalLetterId: draft.replyToLetterId,
          bodyText: draft.bodyText,
          stationeryId: draft.stationeryId,
          senderDisplayName: draft.senderDisplayName,
          unlockAt: draft.unlockAt,
        });
        draft.reset();
        router.replace({ pathname: '/sent', params: { unlockAt: result.unlockAt } });
      } else {
        const result = await sealLetter({
          bodyText: draft.bodyText,
          stationeryId: draft.stationeryId,
          senderDisplayName: draft.senderDisplayName,
          unlockAt: draft.unlockAt,
        });
        draft.reset();
        router.replace({
          pathname: '/share',
          params: { token: result.token, unlockAt: result.unlockAt },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSealed(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Animated.Value.interpolate() reading the ref-backed value during render is how the
  // Animated API is designed to be used (it drives native-side updates outside React's
  // render cycle, not through re-renders), so this is a safe, deliberate exception to the
  // ref-during-render rule rather than an actual purity bug.
  // eslint-disable-next-line react-hooks/refs
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
      <Text style={[styles.title, { color: stationery.textColor }]}>
        Press and hold to seal
      </Text>
      <Pressable
        onPressIn={startHold}
        onPressOut={cancelHold}
        disabled={sealed}
        style={styles.pressArea}
      >
        <Animated.View
          style={[
            styles.wax,
            { backgroundColor: stationery.accentColor, transform: [{ scale }] },
          ]}
        >
          <Text style={styles.waxLetter}>S</Text>
        </Animated.View>
      </Pressable>
      {submitting && <Text style={[styles.status, { color: stationery.mutedTextColor }]}>Sealing...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Georgia',
  },
  pressArea: {
    padding: 20,
  },
  wax: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waxLetter: {
    color: '#F3E9D6',
    fontSize: 40,
    fontWeight: '700',
  },
  status: {
    fontSize: 14,
  },
  error: {
    color: '#B00020',
    fontSize: 14,
    textAlign: 'center',
  },
});
