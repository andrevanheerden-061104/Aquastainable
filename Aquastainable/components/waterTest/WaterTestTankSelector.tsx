import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

import { Palette, qualityTone } from '@/constants/palette';

const ago = (value?: string) => {
  if (!value) return 'No test yet';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return value;
  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  return days === 0 ? 'Tested today' : days === 1 ? 'Tested yesterday' : `Tested ${days} days ago`;
};

type Props = {
  tanks: Array<{
    id: string;
    name: string;
    image?: number | { uri: string };
    testDate?: string;
    waterQuality?: string;
  }>;
  onSelect: (tankId: string) => void;
};

export default function WaterTestTankSelector({ tanks, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {tanks.map((tank) => (
        <TouchableOpacity key={tank.id} style={styles.card} onPress={() => onSelect(tank.id)} activeOpacity={0.9}>
          {tank.image ? <Image source={tank.image} style={styles.image} resizeMode="cover" /> : <View style={styles.imageEmpty} />}
          <View style={styles.cardBody}>
            <Text style={styles.title}>{tank.name}</Text>
            <View style={styles.divider} />
            {(() => {
              const tone = qualityTone(tank.waterQuality);
              return (
                <View style={[styles.pill, { backgroundColor: tone.soft }]}>
                  <View style={[styles.pillDot, { backgroundColor: tone.color }]} />
                  <Text style={[styles.pillText, { color: tone.color }]} numberOfLines={1}>{tone.label}</Text>
                </View>
              );
            })()}
            <Text style={styles.when} numberOfLines={1}>{ago(tank.testDate)}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontFamily: 'Montserrat_700Bold' },
  when: { color: Palette.textMuted, fontSize: 12, marginTop: 8 },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '48%',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 140,
  },
  imageEmpty: {
    width: '100%',
    height: 140,
    backgroundColor: '#20232C',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: '#8F97A6',
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  compactValue: {
    maxWidth: 90,
    textAlign: 'right',
  },
});
