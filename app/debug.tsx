import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

// Phase 1 has no UI beyond this: a way to exercise seal/claim/open/burn against a real
// Supabase project (once one is linked, see supabase/README.md) without building the actual
// compose/receive screens yet. Not linked to any nav flow; open it directly during
// development.

function useJsonAction<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const [result, setResult] = useState<string>('');
  const [pending, setPending] = useState(false);

  const run = async (args: TArgs) => {
    setPending(true);
    try {
      const data = await fn(args);
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPending(false);
    }
  };

  return { result, pending, run };
}

async function invoke(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data;
}

export default function DebugScreen() {
  const [userId, setUserId] = useState<string | null>(null);

  const [bodyText, setBodyText] = useState('A test letter.');
  const [senderDisplayName, setSenderDisplayName] = useState('Debug Sender');
  const [stationeryId, setStationeryId] = useState('classic-cream');
  const [unlockInMinutes, setUnlockInMinutes] = useState('1');

  const [claimToken, setClaimToken] = useState('');
  const [letterId, setLetterId] = useState('');

  const signIn = useJsonAction(async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    setUserId(data.user?.id ?? null);
    return { userId: data.user?.id };
  });

  const seal = useJsonAction(async () => {
    const unlockAt = new Date(Date.now() + Number(unlockInMinutes) * 60_000).toISOString();
    return invoke('seal', { bodyText, senderDisplayName, stationeryId, unlockAt });
  });

  const claim = useJsonAction(async () => invoke('claim', { token: claimToken }));

  const open = useJsonAction(async () => invoke('open', { id: letterId }));

  const burn = useJsonAction(async () => invoke('burn', { id: letterId }));

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Debug</Text>
        <Text style={styles.warning}>
          No Supabase project configured. Set EXPO_PUBLIC_SUPABASE_URL and
          EXPO_PUBLIC_SUPABASE_ANON_KEY (see supabase/README.md) to use this screen.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Debug: seal / claim / open / burn</Text>

      <Section title="1. Sign in anonymously">
        <Button label="Sign in" onPress={() => signIn.run(undefined)} pending={signIn.pending} />
        <Text style={styles.hint}>{userId ? `Signed in as ${userId}` : 'Not signed in'}</Text>
        <Output text={signIn.result} />
      </Section>

      <Section title="2. Seal a letter">
        <Field label="Body text" value={bodyText} onChangeText={setBodyText} />
        <Field label="Sender display name" value={senderDisplayName} onChangeText={setSenderDisplayName} />
        <Field label="Stationery id" value={stationeryId} onChangeText={setStationeryId} />
        <Field
          label="Unlock in minutes"
          value={unlockInMinutes}
          onChangeText={setUnlockInMinutes}
          keyboardType="numeric"
        />
        <Button label="Seal" onPress={() => seal.run(undefined)} pending={seal.pending} />
        <Output text={seal.result} />
      </Section>

      <Section title="3. Claim by token">
        <Field label="Token" value={claimToken} onChangeText={setClaimToken} />
        <Button label="Claim" onPress={() => claim.run(undefined)} pending={claim.pending} />
        <Output text={claim.result} />
      </Section>

      <Section title="4. Open / burn by letter id">
        <Field label="Letter id" value={letterId} onChangeText={setLetterId} />
        <Button label="Open" onPress={() => open.run(undefined)} pending={open.pending} />
        <Output text={open.result} />
        <Button label="Burn" onPress={() => burn.run(undefined)} pending={burn.pending} />
        <Output text={burn.result} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

function Button({ label, onPress, pending }: { label: string; onPress: () => void; pending: boolean }) {
  return (
    <Text
      onPress={pending ? undefined : onPress}
      style={[styles.button, pending && styles.buttonPending]}
    >
      {pending ? `${label}...` : label}
    </Text>
  );
}

function Output({ text }: { text: string }) {
  if (!text) return null;
  return <Text style={styles.output}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: '#FBF7F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  warning: {
    color: '#8a4b08',
  },
  section: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  hint: {
    fontSize: 12,
    color: '#555',
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#7A5B2E',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  buttonPending: {
    opacity: 0.6,
  },
  output: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#f2ece0',
    padding: 8,
    borderRadius: 6,
  },
});
