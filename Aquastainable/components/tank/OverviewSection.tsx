// Tank overview from the AI. Shows paragraphs and "- " lines as a tidy list.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

export default function OverviewSection({ overview }: { overview?: string }) {
  const lines = (overview || '').split('\n').map((line) => line.trim()).filter(Boolean);
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <IconSymbol name="sparkles" size={18} color={Palette.accent} />
        <Text style={styles.title}>Overview</Text>
      </View>
      <View style={styles.card}>
        {lines.length ? lines.map((line, index) => {
          const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
          return bullet ? (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.dot} />
              <Text style={styles.bullet}>{bullet[1]}</Text>
            </View>
          ) : <Text key={index} style={styles.text}>{line.replace(/\*\*/g, '')}</Text>;
        }) : <Text style={styles.text}>No overview yet. Add fish, plants or a water test and one will appear here.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { color: Palette.text, fontSize: 22, fontFamily: 'Montserrat_700Bold' },
  card: { backgroundColor: Palette.surface, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: Palette.border },
  text: { color: Palette.textMuted, fontSize: 15, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.primaryBright, marginTop: 8 },
  bullet: { flex: 1, color: Palette.text, fontSize: 15, lineHeight: 22 },
});
