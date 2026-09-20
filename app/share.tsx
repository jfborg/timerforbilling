import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import BRAND from '../constants/brand.json';
import { getStationery } from '../constants/stationery';

export default function ShareScreen() {
  const router = useRouter();
  const { token, unlockAt } = useLocalSearchParams<{ token: string; unlockAt: string }>();
  const stationery = getStationery('classic-cream');
  const [copied, setCopied] = useState(false);

  const link = `${BRAND.linkBaseUrl}/${token}`;
  const unlockDate = unlockAt ? new Date(unlockAt) : null;

  const openShareSheet = async () => {
    try {
      await Share.share({
        message: `I sealed you a letter. It opens ${unlockDate?.toLocaleString() ?? 'soon'}: ${link}`,
        url: link,
      });
    } catch {
      // The user dismissing the share sheet is not an error worth surfacing.
    }
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: stationery.paperColor }]}>
      <Text style={[styles.title, { color: stationery.textColor }]}>Sealed</Text>

      <View style={[styles.envelope, { backgroundColor: stationery.cardColor, borderColor: stationery.borderColor }]}>
        <View style={[styles.wax, { backgroundColor: stationery.accentColor }]}>
          <Text style={styles.waxLetter}>S</Text>
        </View>
        <Text style={[styles.opens, { color: stationery.mutedTextColor }]}>
          {unlockDate ? `Opens ${unlockDate.toLocaleString()}` : 'Opens soon'}
        </Text>
      </View>

      <Text onPress={openShareSheet} style={[styles.button, { backgroundColor: stationery.accentColor }]}>
        Share the link
      </Text>
      <Text onPress={copyLink} style={[styles.linkText, { color: stationery.mutedTextColor }]}>
        {copied ? 'Copied!' : link}
      </Text>

      <Text onPress={() => router.replace('/')} style={[styles.done, { color: stationery.accentColor }]}>
        Done
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  envelope: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    minWidth: 240,
  },
  wax: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waxLetter: {
    color: '#F3E9D6',
    fontSize: 22,
    fontWeight: '700',
  },
  opens: {
    fontSize: 14,
  },
  button: {
    color: '#fff',
    fontWeight: '700',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  linkText: {
    fontSize: 12,
    textAlign: 'center',
  },
  done: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
  },
});
