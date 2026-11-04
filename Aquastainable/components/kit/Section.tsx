// Section heading used across detail pages: optional icon, title, optional hint on the right.
import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

type Props = { title: string; icon?: string; iconColor?: string; hint?: string; subtitle?: string; children?: ReactNode; style?: any };

export default function Section({ title, icon, iconColor = Palette.primaryBright, hint, subtitle, children, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          {icon ? <IconSymbol name={icon as any} size={18} color={iconColor} /> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: Palette.text, fontSize: 20, fontFamily: 'Montserrat_700Bold' },
  hint: { color: Palette.textFaint, fontSize: 12, fontFamily: 'Montserrat_600SemiBold' },
  subtitle: { color: Palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: -6, marginBottom: 12 },
});
