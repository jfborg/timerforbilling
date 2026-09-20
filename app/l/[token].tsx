import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { claimLetter } from '../../lib/api';
import { getStationery } from '../../constants/stationery';
import { useAuthStore } from '../../store/useAuthStore';

// The in-app landing spot for a universal/app link (brief section 6, Receive step 2): the OS
// hands a tap on https://<linkHost>/l/<token> straight to this route instead of the browser,
// once associatedDomains/intentFilters (app.config.ts) are verified against a real domain.
// Same URL shape the web landing page uses, so one link works whether or not the app is
// installed yet.
export default function DeepLinkClaimScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const stationery = getStationery('classic-cream');
  const ensureSignedIn = useAuthStore((s) => s.ensureSignedIn);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      const userId = await ensureSignedIn();
      if (cancelled) return;
      if (!userId) {
        setErrorMessage('Could not sign in. Check your connection and try again.');
        return;
      }
      try {
        await claimLetter(token);
        if (!cancelled) router.replace('/shelf');
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(describeClaimError(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, ensureSignedIn, router]);

  return (
    <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
      {errorMessage ? (
        <>
          <Text style={styles.error}>{errorMessage}</Text>
          <Text onPress={() => router.replace('/claim')} style={[styles.link, { color: stationery.accentColor }]}>
            Enter the code manually
          </Text>
        </>
      ) : (
        <Text style={{ color: stationery.mutedTextColor }}>Opening your letter...</Text>
      )}
    </View>
  );
}

function describeClaimError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('letter_not_found')) return "That link doesn't match a letter.";
  if (message.includes('already_claimed')) return 'Someone already claimed this letter.';
  if (message.includes('cannot_claim_own_letter')) return "That's your own letter.";
  return message;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  error: {
    color: '#B00020',
    textAlign: 'center',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});
