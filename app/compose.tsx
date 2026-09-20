import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getStationery } from '../constants/stationery';
import { useComposeStore } from '../store/useComposeStore';

type QuickPick = { label: string; computeIso: () => string };

function atTime(daysFromNow: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

function nextWeekday(targetDay: number, hour: number): Date {
  const d = new Date();
  const diff = (targetDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const QUICK_PICKS: QuickPick[] = [
  { label: 'Tonight', computeIso: () => atTime(0, 21).toISOString() },
  { label: 'Tomorrow morning', computeIso: () => atTime(1, 8).toISOString() },
  { label: 'This weekend', computeIso: () => nextWeekday(6, 10).toISOString() },
  {
    label: 'In a month',
    computeIso: () => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString();
    },
  },
];

export default function ComposeScreen() {
  const router = useRouter();
  const stationery = getStationery(useComposeStore((s) => s.stationeryId));
  const bodyText = useComposeStore((s) => s.bodyText);
  const senderDisplayName = useComposeStore((s) => s.senderDisplayName);
  const unlockAt = useComposeStore((s) => s.unlockAt);
  const replyToSenderDisplayName = useComposeStore((s) => s.replyToSenderDisplayName);
  const setField = useComposeStore((s) => s.setField);

  const [customDays, setCustomDays] = useState('0');
  const [customHours, setCustomHours] = useState('1');
  const [customMinutes, setCustomMinutes] = useState('0');
  const [useCustom, setUseCustom] = useState(false);

  // Reading the current time is a side effect, not something to do during render (the
  // react-hooks purity rule flags any Date.now() reachable from render, including inside
  // useMemo or an effect body). Each field's onChangeText is a real event handler, so this
  // computes and stores the resulting ISO string there instead of deriving it reactively.
  const [customIso, setCustomIso] = useState(() => new Date(Date.now() + 3_600_000).toISOString());
  const recomputeCustomIso = (days: string, hours: string, minutes: string) => {
    const ms = (Number(days) || 0) * 86_400_000 + (Number(hours) || 0) * 3_600_000 + (Number(minutes) || 0) * 60_000;
    setCustomIso(new Date(Date.now() + ms).toISOString());
  };

  const effectiveUnlockAt = useCustom ? customIso : unlockAt;

  const canContinue = bodyText.trim().length > 0 && senderDisplayName.trim().length > 0 && !!effectiveUnlockAt;

  const goToSeal = () => {
    if (!canContinue || !effectiveUnlockAt) return;
    setField('unlockAt', effectiveUnlockAt);
    router.push('/seal');
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: stationery.paperColor }]}
    >
      <Text style={[styles.title, { color: stationery.textColor }]}>
        {replyToSenderDisplayName ? `Write back to ${replyToSenderDisplayName}` : 'Write a letter'}
      </Text>

      <View style={[styles.card, { backgroundColor: stationery.cardColor, borderColor: stationery.borderColor }]}>
        <Text style={[styles.label, { color: stationery.mutedTextColor }]}>Your name (shown to the recipient)</Text>
        <TextInput
          style={[styles.input, { color: stationery.textColor, borderColor: stationery.borderColor }]}
          value={senderDisplayName}
          onChangeText={(t) => setField('senderDisplayName', t)}
          placeholder="How should they see you?"
          maxLength={60}
        />
      </View>

      <View style={[styles.card, { backgroundColor: stationery.cardColor, borderColor: stationery.borderColor }]}>
        <Text style={[styles.label, { color: stationery.mutedTextColor }]}>Letter</Text>
        <TextInput
          style={[
            styles.input,
            styles.bodyInput,
            { color: stationery.textColor, borderColor: stationery.borderColor },
          ]}
          value={bodyText}
          onChangeText={(t) => setField('bodyText', t)}
          placeholder="Dear..."
          multiline
          maxLength={10000}
        />
      </View>

      <View style={[styles.card, { backgroundColor: stationery.cardColor, borderColor: stationery.borderColor }]}>
        <Text style={[styles.label, { color: stationery.mutedTextColor }]}>When does it open?</Text>
        <View style={styles.chipRow}>
          {QUICK_PICKS.map((pick) => {
            const active = !useCustom && unlockAt !== null && pick.label === lastPickedLabel(unlockAt, QUICK_PICKS);
            return (
              <Text
                key={pick.label}
                onPress={() => {
                  setUseCustom(false);
                  setField('unlockAt', pick.computeIso());
                }}
                style={[
                  styles.chip,
                  { borderColor: stationery.accentColor },
                  active && { backgroundColor: stationery.accentColor },
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive, { color: active ? '#fff' : stationery.textColor }]}>
                  {pick.label}
                </Text>
              </Text>
            );
          })}
          <Text
            onPress={() => setUseCustom(true)}
            style={[styles.chip, { borderColor: stationery.accentColor }, useCustom && { backgroundColor: stationery.accentColor }]}
          >
            <Text style={[styles.chipText, { color: useCustom ? '#fff' : stationery.textColor }]}>Custom</Text>
          </Text>
        </View>

        {useCustom && (
          <View style={styles.customRow}>
            <NumberField
              label="days"
              value={customDays}
              onChangeText={(t) => {
                setCustomDays(t);
                recomputeCustomIso(t, customHours, customMinutes);
              }}
              stationery={stationery}
            />
            <NumberField
              label="hours"
              value={customHours}
              onChangeText={(t) => {
                setCustomHours(t);
                recomputeCustomIso(customDays, t, customMinutes);
              }}
              stationery={stationery}
            />
            <NumberField
              label="min"
              value={customMinutes}
              onChangeText={(t) => {
                setCustomMinutes(t);
                recomputeCustomIso(customDays, customHours, t);
              }}
              stationery={stationery}
            />
          </View>
        )}

        {effectiveUnlockAt && (
          <Text style={[styles.previewTime, { color: stationery.accentColor }]}>
            Opens {new Date(effectiveUnlockAt).toLocaleString()}
          </Text>
        )}
      </View>

      <Text
        onPress={goToSeal}
        style={[
          styles.continueButton,
          { backgroundColor: canContinue ? stationery.accentColor : '#bbb' },
        ]}
      >
        Continue to seal
      </Text>
    </ScrollView>
  );
}

function lastPickedLabel(iso: string, picks: QuickPick[]): string | undefined {
  // Best-effort highlight: recompute each preset and see which one currently matches within
  // a minute, since "now" moves between render passes.
  const target = new Date(iso).getTime();
  return picks.find((p) => Math.abs(new Date(p.computeIso()).getTime() - target) < 60_000)?.label;
}

function NumberField({
  label,
  value,
  onChangeText,
  stationery,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  stationery: ReturnType<typeof getStationery>;
}) {
  return (
    <View style={styles.numberField}>
      <TextInput
        style={[styles.numberInput, { color: stationery.textColor, borderColor: stationery.borderColor }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
      />
      <Text style={[styles.numberLabel, { color: stationery.mutedTextColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'Georgia',
    fontSize: 16,
  },
  bodyInput: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
  },
  chipTextActive: {
    fontWeight: '700',
  },
  customRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  numberField: {
    alignItems: 'center',
    gap: 4,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    width: 56,
    textAlign: 'center',
    paddingVertical: 6,
  },
  numberLabel: {
    fontSize: 11,
  },
  previewTime: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  continueButton: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
