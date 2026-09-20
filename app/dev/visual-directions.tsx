import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// Brief section 9: three distinct static directions behind a dev menu, so the owner can
// choose before any real screens get built. Not linked from the app's normal nav; open
// /dev/visual-directions directly. System fonts only here on purpose: real OFL/Apache
// fonts (section 9's "one serif and one handwriting-style font") get committed once a
// direction is chosen, not spent on three throwaway mocks.

type Direction = 'A' | 'B' | 'C';

const DIRECTIONS: { key: Direction; label: string }[] = [
  { key: 'A', label: 'A · Classic stationery' },
  { key: 'B', label: 'B · Modern post' },
  { key: 'C', label: 'C · Night mail' },
];

export default function VisualDirectionsScreen() {
  const [active, setActive] = useState<Direction>('A');

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {DIRECTIONS.map((d) => (
          <Text
            key={d.key}
            onPress={() => setActive(d.key)}
            style={[styles.tab, active === d.key && styles.tabActive]}
          >
            {d.label}
          </Text>
        ))}
      </View>
      {active === 'A' && <ClassicStationery />}
      {active === 'B' && <ModernPost />}
      {active === 'C' && <NightMail />}
    </View>
  );
}

function ClassicStationery() {
  return (
    <ScrollView contentContainerStyle={[styles.stage, { backgroundColor: '#F3E9D6' }]}>
      <Text style={[styles.heading, { color: '#3A2A1A', fontFamily: 'Georgia' }]}>Sealed</Text>

      <View style={[styles.card, { backgroundColor: '#FBF5E9', borderColor: '#D8C6A0' }]}>
        <Text style={[styles.cardLabel, { color: '#8A7455', fontFamily: 'Georgia' }]}>Compose</Text>
        <Text style={[styles.paper, { fontFamily: 'Georgia', color: '#3A2A1A' }]}>
          Dear you, by the time you read this...
        </Text>
      </View>

      <View style={[styles.card, styles.envelopeCard, { backgroundColor: '#EFE0C4', borderColor: '#C9AE7E' }]}>
        <Text style={[styles.cardLabel, { color: '#8A7455', fontFamily: 'Georgia' }]}>Sealed</Text>
        <View style={styles.sealRow}>
          <View style={[styles.wax, { backgroundColor: '#8B1E1E' }]}>
            <Text style={styles.waxLetter}>S</Text>
          </View>
          <Text style={[styles.envelopeText, { fontFamily: 'Georgia', color: '#5C4325' }]}>
            Opens Saturday morning
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: '#FBF5E9', borderColor: '#D8C6A0' }]}>
        <Text style={[styles.cardLabel, { color: '#8A7455', fontFamily: 'Georgia' }]}>Countdown</Text>
        <Text style={[styles.countdown, { fontFamily: 'Georgia', color: '#8B1E1E' }]}>2d 04h 12m</Text>
      </View>
    </ScrollView>
  );
}

function ModernPost() {
  return (
    <ScrollView contentContainerStyle={[styles.stage, { backgroundColor: '#F4F5F7' }]}>
      <Text style={[styles.heading, { color: '#111', fontFamily: 'Helvetica', fontWeight: '800' }]}>
        SEALED
      </Text>

      <View style={[styles.card, { backgroundColor: '#fff', borderColor: '#E3E5EA' }]}>
        <Text style={[styles.cardLabel, { color: '#7A7F8A', fontFamily: 'Helvetica' }]}>Compose</Text>
        <Text style={[styles.paper, { fontFamily: 'Helvetica', color: '#111' }]}>
          Dear you, by the time you read this...
        </Text>
      </View>

      <View style={[styles.card, styles.envelopeCard, { backgroundColor: '#2A4BD7', borderColor: '#2A4BD7' }]}>
        <Text style={[styles.cardLabel, { color: '#C7D0FF', fontFamily: 'Helvetica' }]}>Sealed</Text>
        <View style={styles.sealRow}>
          <View style={[styles.hexSeal, { backgroundColor: '#FF5A5F' }]} />
          <Text style={[styles.envelopeText, { fontFamily: 'Helvetica', color: '#fff', fontWeight: '700' }]}>
            Opens Saturday morning
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: '#fff', borderColor: '#E3E5EA' }]}>
        <Text style={[styles.cardLabel, { color: '#7A7F8A', fontFamily: 'Helvetica' }]}>Countdown</Text>
        <Text style={[styles.countdown, { fontFamily: 'Helvetica', color: '#2A4BD7', fontWeight: '800' }]}>
          2d 04h 12m
        </Text>
      </View>
    </ScrollView>
  );
}

function NightMail() {
  const stars = Array.from({ length: 18 });
  return (
    <ScrollView contentContainerStyle={[styles.stage, { backgroundColor: '#0B0E1A' }]}>
      <View style={styles.starField} pointerEvents="none">
        {stars.map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                top: `${(i * 37) % 100}%`,
                left: `${(i * 53) % 100}%`,
                opacity: 0.3 + ((i * 7) % 10) / 15,
              },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.heading, { color: '#D4AF37', fontFamily: 'Georgia' }]}>Sealed</Text>

      <View style={[styles.card, { backgroundColor: '#151A2C', borderColor: '#2C3452' }]}>
        <Text style={[styles.cardLabel, { color: '#9AA3C4', fontFamily: 'Georgia' }]}>Compose</Text>
        <Text style={[styles.paper, { fontFamily: 'Georgia', color: '#E7E9F5' }]}>
          Dear you, by the time you read this...
        </Text>
      </View>

      <View style={[styles.card, styles.envelopeCard, { backgroundColor: '#151A2C', borderColor: '#D4AF37' }]}>
        <Text style={[styles.cardLabel, { color: '#9AA3C4', fontFamily: 'Georgia' }]}>Sealed</Text>
        <View style={styles.sealRow}>
          <View style={[styles.wax, { backgroundColor: '#1B2038', borderWidth: 2, borderColor: '#D4AF37' }]}>
            <Text style={[styles.waxLetter, { color: '#D4AF37' }]}>S</Text>
          </View>
          <Text style={[styles.envelopeText, { fontFamily: 'Georgia', color: '#E7E9F5' }]}>
            Opens Saturday morning
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: '#151A2C', borderColor: '#2C3452' }]}>
        <Text style={[styles.cardLabel, { color: '#9AA3C4', fontFamily: 'Georgia' }]}>Countdown</Text>
        <Text style={[styles.countdown, { fontFamily: 'Georgia', color: '#D4AF37' }]}>2d 04h 12m</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabs: {
    flexDirection: 'row',
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: '#000',
  },
  tab: {
    color: '#888',
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  tabActive: {
    color: '#fff',
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  stage: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
    alignItems: 'stretch',
  },
  heading: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  envelopeCard: {
    minHeight: 90,
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paper: {
    fontSize: 16,
    lineHeight: 22,
  },
  sealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  wax: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waxLetter: {
    color: '#F3E9D6',
    fontWeight: '700',
    fontSize: 16,
  },
  hexSeal: {
    width: 36,
    height: 36,
    borderRadius: 8,
    transform: [{ rotate: '45deg' }],
  },
  envelopeText: {
    fontSize: 15,
  },
  countdown: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 1,
  },
  starField: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#D4AF37',
  },
});
