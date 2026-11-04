// Result pop-up (success / warning / problem): big status icon with a soft glow,
// title, message, optional stat chips and actions. Slides up from the bottom.
import React, { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, ZoomIn } from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

export type ResultTone = 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<ResultTone, { icon: string; color: string; soft: string; label: string }> = {
  success: { icon: 'checkmark.circle.fill', color: Palette.success, soft: Palette.successSoft, label: 'Good match' },
  warning: { icon: 'exclamationmark.triangle', color: Palette.warning, soft: Palette.warningSoft, label: 'Check this' },
  danger: { icon: 'xmark.circle.fill', color: Palette.danger, soft: Palette.dangerSoft, label: 'Not safe' },
  info: { icon: 'info.circle', color: Palette.primaryBright, soft: Palette.primarySoft, label: 'Heads up' },
};

type Props = {
  visible: boolean;
  tone: ResultTone;
  eyebrow?: string;
  title: string;
  message?: string;
  stats?: { label: string; value: string }[];
  children?: ReactNode; // actions (hold / swipe gestures)
  onClose: () => void;
};

export default function ResultSheet({ visible, tone, eyebrow, title, message, stats = [], children, onClose }: Props) {
  const t = TONES[tone];
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.sheet}>
          <View style={styles.grabber} />
          <Animated.View entering={ZoomIn.delay(120).springify()} style={[styles.iconOuter, { backgroundColor: t.soft }]}>
            <View style={[styles.iconInner, { borderColor: t.color }]}>
              <IconSymbol name={t.icon as any} size={34} color={t.color} />
            </View>
          </Animated.View>
          <Text style={[styles.eyebrow, { color: t.color }]}>{eyebrow || t.label}</Text>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {stats.length ? (
            <View style={styles.stats}>
              {stats.map((stat) => (
                <View key={stat.label} style={styles.stat}>
                  <Text style={styles.statValue}>{stat.value || '–'}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {children ? <View style={styles.actions}>{children}</View> : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,7,10,0.7)' },
  sheet: {
    backgroundColor: Palette.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingBottom: 34,
    alignItems: 'center', borderWidth: 1, borderColor: Palette.border,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: Palette.borderStrong, marginTop: 10, marginBottom: 18 },
  iconOuter: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  iconInner: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.surface },
  eyebrow: { fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: 'Montserrat_700Bold' },
  title: { color: Palette.text, fontSize: 22, lineHeight: 28, fontFamily: 'Montserrat_700Bold', textAlign: 'center', marginTop: 6 },
  message: { color: Palette.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 330 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 18, alignSelf: 'stretch' },
  stat: { flex: 1, backgroundColor: Palette.surfaceRaised, borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Palette.border },
  statValue: { color: Palette.text, fontSize: 18, fontFamily: 'Montserrat_700Bold' },
  statLabel: { color: Palette.textFaint, fontSize: 11, marginTop: 2, fontFamily: 'Montserrat_600SemiBold' },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 20 },
});
