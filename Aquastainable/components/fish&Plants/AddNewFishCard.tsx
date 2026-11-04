// "Add new fish" tile. Hold it to open the add flow (shared HoldAction gesture).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import HoldAction from '@/components/gestures/HoldAction';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

export default function AddNewFishCard({ onPress }: { onPress?: () => void }) {
  return (
    <HoldAction onComplete={() => onPress?.()} tone="ghost" accessibilityLabel="Add a new fish" style={styles.card} contentStyle={styles.content}>
      <View style={styles.icon}><IconSymbol name="plus" size={28} color={Palette.primaryBright} /></View>
      <Text style={styles.label}>Add a fish</Text>
      <Text style={styles.hint}>Press and hold</Text>
    </HoldAction>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', minHeight: 190, borderRadius: 22, marginBottom: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Palette.primaryBorder, backgroundColor: Palette.surface },
  content: { flexDirection: 'column', gap: 8 },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  label: { color: Palette.text, fontSize: 15, fontFamily: 'Montserrat_600SemiBold' },
  hint: { color: Palette.textFaint, fontSize: 12 },
});
