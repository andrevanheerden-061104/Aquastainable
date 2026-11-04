// Photo card with a frosted name strip over the bottom of the image ("Explore collection"
// style). Hold anywhere on the card to open it (the app's no-buttons rule); a quick
// info row can sit under the photo, and an actions footer under that.
import React, { ReactNode } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import HoldAction from '@/components/gestures/HoldAction';
import Fade from '@/components/ui/Fade';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

export type PhotoCardMeta = { icon: string; label: string; color?: string };

type Props = {
  image?: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: 'default' | 'good' | 'warn' | 'bad';
  onPress?: () => void; // fired by holding the card
  height?: number;
  style?: StyleProp<ViewStyle>;
  meta?: PhotoCardMeta[];
  footer?: ReactNode;
  accessibilityLabel?: string;
};

const BADGE = {
  default: { dot: Palette.primaryBright },
  good: { dot: Palette.success },
  warn: { dot: Palette.warning },
  bad: { dot: Palette.danger },
};

export default function PhotoCard({ image, title, subtitle, badge, badgeTone = 'default', onPress, height = 210, style, meta = [], footer, accessibilityLabel }: Props) {
  const body = (
    <>
      <View style={[styles.photo, { height }]}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.empty]}><IconSymbol name="fish.fill" size={40} color={Palette.textFaint} /></View>
        )}
        <Fade stops={[{ offset: 0.45, color: '#000', opacity: 0 }, { offset: 1, color: '#000', opacity: 0.75 }]} />
        {badge ? (
          <View style={styles.badge}>
            <View style={[styles.badgeDot, { backgroundColor: BADGE[badgeTone].dot }]} />
            <Text style={styles.badgeText} numberOfLines={1}>{badge}</Text>
          </View>
        ) : null}
        <View style={styles.strip}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      {meta.length ? (
        <View style={styles.meta}>
          {meta.map((item) => (
            <View key={`${item.icon}-${item.label}`} style={styles.metaRow}>
              <IconSymbol name={item.icon as any} size={14} color={item.color || Palette.primaryBright} />
              <Text style={styles.metaText} numberOfLines={1}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.card, style]}>
      {onPress ? (
        <HoldAction
          onComplete={onPress}
          tone="ghost"
          rippleOnTop
          style={styles.hold}
          contentStyle={styles.holdContent}
          accessibilityLabel={accessibilityLabel || `Hold to open ${title}`}
        >
          {body}
        </HoldAction>
      ) : body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  hold: { paddingHorizontal: 0, borderRadius: 0, borderWidth: 0, minHeight: 0 },
  holdContent: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: 0 },
  photo: { width: '100%', justifyContent: 'flex-end', backgroundColor: '#000' },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.surfaceRaised },
  badge: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(12,14,18,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    maxWidth: '86%',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { flexShrink: 1, color: Palette.text, fontSize: 11, fontFamily: 'Montserrat_600SemiBold' },
  strip: {
    margin: 8, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 18, backgroundColor: 'rgba(20,24,30,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backdropFilter: 'blur(10px)',
  } as any,
  title: { color: Palette.text, fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  subtitle: { color: Palette.textMuted, fontSize: 11, marginTop: 1 },
  meta: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { flex: 1, color: Palette.textMuted, fontSize: 12 },
  footer: { padding: 8, gap: 8, flexDirection: 'row' },
});
