import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { claimLetter } from '../lib/api';
import { getStationery } from '../constants/stationery';
import { useAuthStore } from '../store/useAuthStore';

export default function ClaimScreen() {
  const router = useRouter();
  const stationery = getStationery('classic-cream');
  const ensureSignedIn = useAuthStore((s) => s.ensureSignedIn);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const userId = await ensureSignedIn();
      if (!userId) throw new Error('Could not sign in. Check your connection and try again.');
      await claimLetter(code.trim());
      router.replace('/shelf');
    } catch (err) {
      setError(describeClaimError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
      <Text style={[styles.title, { color: stationery.textColor }]}>Have a letter?</Text>
      <Text style={[styles.subtitle, { color: stationery.mutedTextColor }]}>
        Enter the code from the link or the web page.
      </Text>
      <TextInput
        style={[styles.input, { color: stationery.textColor, borderColor: stationery.borderColor }]}
        value={code}
        onChangeText={setCode}
        placeholder="Claim code"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Text
        onPress={submit}
        style={[
          styles.button,
          { backgroundColor: submitting || !code.trim() ? '#bbb' : stationery.accentColor },
        ]}
      >
        {submitting ? 'Claiming...' : 'Claim'}
      </Text>
    </View>
  );
}

function describeClaimError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('letter_not_found')) return "That code doesn't match a letter.";
  if (message.includes('already_claimed')) return 'Someone already claimed this letter.';
  if (message.includes('cannot_claim_own_letter')) return "That's your own letter.";
  return message;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    maxWidth: 320,
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    color: '#fff',
    fontWeight: '700',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  error: {
    color: '#B00020',
    fontSize: 13,
  },
});
