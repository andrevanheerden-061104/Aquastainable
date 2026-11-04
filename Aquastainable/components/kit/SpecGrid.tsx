// Spec tiles in a 3-column grid (icon, bold value, small label), like the
// "Specifications" blocks in the inspiration boards. Use tone to colour a tile
// (e.g. a water reading that is unsafe).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

export type SpecItem = {
  icon: string;
  label: string;
  value?: string | number | null;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'accent';
};

const TONES = {
  default: { icon: Palette.primaryBright, soft: Palette.primarySoft, value: Palette.text },
  accent: { icon: Palette.accent, soft: Palette.accentSoft, value: Palette.text },
  good: { icon: Palette.success, soft: Palette.successSoft, value: Palette.text },
  warn: { icon: Palette.warning, soft: Palette.warningSoft, value: Palette.warning },
  bad: { icon: Palette.danger, soft: Palette.dangerSoft, value: Palette.dangerText },
};

const display = (value: SpecItem['value']) => {
  if (value === undefined || value === null) return '–';
  const text = String(value).trim();
  return text && text.toLowerCase() !== 'not available' && text.toLowerCase() !== 'n/a' ? text : '–';
};

export default function SpecGrid({ items, columns = 3 }: { items: SpecItem[]; columns?: 2 | 3 }) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => {
        const tone = TONES[item.tone || 'default'];
        return (
          <Animated.View
            key={item.label}
            entering={FadeInUp.duration(320).delay(40 * index)}
            style={[styles.tile, { width: columns === 3 ? '31.6%' : '48.5%' }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: tone.soft }]}>
              <IconSymbol name={item.icon as any} size={16} color={tone.icon} />
            </View>
            <Text style={[styles.value, { color: tone.value }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
              {display(item.value)}
            </Text>
            <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  tile: {
    backgroundColor: Palette.surfaceRaised, borderRadius: 18, padding: 12, gap: 6, minHeight: 104,
    borderWidth: 1, borderColor: Palette.border,
  },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  value: { fontSize: 15, lineHeight: 19, fontFamily: 'Montserrat_700Bold' },
  label: { color: Palette.textFaint, fontSize: 11, fontFamily: 'Montserrat_600SemiBold' },
});
