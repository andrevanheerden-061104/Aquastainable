// Photo card with a frosted name strip over the bottom of the image ("Explore collection"
// style). Tapping a card to open it is fine; destructive actions stay as hold gestures.
import React, { ReactNode } from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import Fade from '@/components/ui/Fade';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

type Props = {
  image?: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  accessibilityLabel?: string;
};

export default function PhotoCard({ image, title, subtitle, badge, onPress, height = 210, style, footer, accessibilityLabel }: Props) {
  return (
    <View style={[styles.card, style]}>
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={accessibilityLabel || `Open ${title}`}>
        <View style={[styles.photo, { height }]}>
          {image ? (
            <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.empty]}><IconSymbol name="fish.fill" size={40} color={Palette.textFaint} /></View>
          )}
          <Fade stops={[{ offset: 0.45, color: '#000', opacity: 0 }, { offset: 1, color: '#000', opacity: 0.75 }]} />
          {badge ? <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>{badge}</Text></View> : null}
          <View style={styles.strip}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            {onPress ? (
              <View style={styles.go}><IconSymbol name="chevron.right" size={18} color={Palette.background} /></View>
            ) : null}
          </View>
        </View>
      </Pressable>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  photo: { width: '100%', justifyContent: 'flex-end', backgroundColor: '#000' },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.surfaceRaised },
  badge: { position: 'absolute', top: 10, left: 10, maxWidth: '80%', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(12,14,18,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  badgeText: { color: Palette.text, fontSize: 11, fontFamily: 'Montserrat_600SemiBold' },
  strip: {
    margin: 8, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingLeft: 12, paddingRight: 6,
    borderRadius: 18, backgroundColor: 'rgba(20,24,30,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backdropFilter: 'blur(10px)',
  } as any,
  title: { color: Palette.text, fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  subtitle: { color: Palette.textMuted, fontSize: 11, marginTop: 1 },
  go: { width: 30, height: 30, borderRadius: 15, backgroundColor: Palette.text, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 8, gap: 8, flexDirection: 'row' },
});
