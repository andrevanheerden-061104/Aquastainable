// Card for a paragraph of text (species overview, notes): soft gradient-like tint,
// accent bar on the left, optional eyebrow and a small footer line.
import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

type Props = { eyebrow?: string; icon?: string; text: string; color?: string; footer?: ReactNode };

export default function ProseCard({ eyebrow, icon = 'info.circle', text, color = Palette.primaryBright, footer }: Props) {
  return (
    <View style={[styles.card, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      {eyebrow ? (
        <View style={styles.head}>
          <IconSymbol name={icon as any} size={15} color={color} />
          <Text style={[styles.eyebrow, { color }]}>{eyebrow.toUpperCase()}</Text>
        </View>
      ) : null}
      <Text style={styles.text}>{text}</Text>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, backgroundColor: Palette.surface, padding: 18, paddingLeft: 22, gap: 10, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { fontSize: 11, letterSpacing: 1.2, fontFamily: 'Montserrat_700Bold' },
  text: { color: Palette.text, fontSize: 15, lineHeight: 24 },
  footer: { paddingTop: 12, borderTopWidth: 1, borderTopColor: Palette.border, gap: 6 },
});
