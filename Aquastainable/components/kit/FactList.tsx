// "Quick facts" card: one rounded card with icon rows (label left, value right),
// split by hairlines. Empty values are skipped, so it never shows blank rows.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

export type Fact = { icon: string; label: string; value?: string | number | null; color?: string };

export default function FactList({ items }: { items: Fact[] }) {
  const rows = items.filter((item) => item.value !== null && item.value !== undefined && String(item.value).trim() && !['~', '-', '—'].includes(String(item.value).trim()));
  if (!rows.length) return null;
  return (
    <View style={styles.card}>
      {rows.map((item, index) => (
        <View key={item.label} style={[styles.row, index > 0 && styles.divider]}>
          <View style={[styles.icon, { backgroundColor: `${item.color || Palette.accent}24` }]}>
            <IconSymbol name={item.icon as any} size={15} color={item.color || Palette.accent} />
          </View>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value} numberOfLines={3}>{String(item.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: Palette.border },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { width: 96, color: Palette.textFaint, fontSize: 12, fontFamily: 'Montserrat_600SemiBold' },
  value: { flex: 1, color: Palette.text, fontSize: 14, lineHeight: 19, textAlign: 'right' },
});
