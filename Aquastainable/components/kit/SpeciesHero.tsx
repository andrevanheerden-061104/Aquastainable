// Big photo header for fish / plant / tank pages: the photo runs under the status bar,
// fades into the dark page, and the name sits on top in two weights
// ("Siamese" light + "Fighting Fish" bold), like the inspiration boards.
import { useRouter } from 'expo-router';
import React, { ReactNode } from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Fade from '@/components/ui/Fade';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

type Props = {
  image?: ImageSourcePropType | null;
  title: string;
  subtitle?: string; // e.g. scientific name
  chips?: { label: string; tone?: 'default' | 'good' | 'warn' | 'bad' }[];
  right?: ReactNode; // e.g. an Edit action
  height?: number;
  onBack?: () => void;
};

const CHIP = {
  default: { bg: 'rgba(255,255,255,0.10)', fg: Palette.text, dot: Palette.primaryBright },
  good: { bg: Palette.successSoft, fg: Palette.success, dot: Palette.success },
  warn: { bg: Palette.warningSoft, fg: Palette.warning, dot: Palette.warning },
  bad: { bg: Palette.dangerSoft, fg: Palette.dangerText, dot: Palette.danger },
};

export function splitTitle(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return { light: '', bold: title };
  return { light: words[0], bold: words.slice(1).join(' ') };
}

export default function SpeciesHero({ image, title, subtitle, chips = [], right, height = 400, onBack }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { light, bold } = splitTitle(title);

  return (
    <View style={[styles.hero, { height }]}>
      {image ? (
        <Animated.View entering={FadeIn.duration(400)} style={StyleSheet.absoluteFill}>
          <Image source={image} style={styles.image} resizeMode="cover" />
        </Animated.View>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.empty]}>
          <IconSymbol name="fish.fill" size={64} color={Palette.textFaint} />
        </View>
      )}
      <Fade stops={[
        { offset: 0, color: '#05070A', opacity: 0.55 },
        { offset: 0.22, color: '#05070A', opacity: 0 },
        { offset: 0.55, color: '#05070A', opacity: 0.15 },
        { offset: 1, color: Palette.background, opacity: 1 },
      ]} />

      <View style={[styles.topBar, { top: insets.top + 6 }]}>
        <Pressable onPress={onBack || (() => router.back())} style={styles.round} hitSlop={8} accessibilityLabel="Go back">
          <IconSymbol name="chevron.left" size={24} color={Palette.text} />
        </Pressable>
        {right}
      </View>

      <Animated.View entering={FadeInDown.duration(420).delay(80)} style={styles.titleBlock}>
        {chips.length ? (
          <View style={styles.chips}>
            {chips.map((chip) => {
              const c = CHIP[chip.tone || 'default'];
              return (
                <View key={chip.label} style={[styles.chip, { backgroundColor: c.bg }]}>
                  <View style={[styles.dot, { backgroundColor: c.dot }]} />
                  <Text style={[styles.chipText, { color: c.fg }]} numberOfLines={1}>{chip.label}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
        {light ? <Text style={styles.light}>{light}</Text> : null}
        <Text style={styles.bold} numberOfLines={2}>{bold}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', backgroundColor: '#000', justifyContent: 'flex-end', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.surface },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,14,18,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  titleBlock: { paddingHorizontal: 20, paddingBottom: 6, maxWidth: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, maxWidth: '100%', flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { flexShrink: 1, fontSize: 12, fontFamily: 'Montserrat_600SemiBold' },
  light: { color: 'rgba(244,246,248,0.85)', fontSize: 28, lineHeight: 34, fontFamily: 'Montserrat_400Regular' },
  bold: { color: Palette.text, fontSize: 34, lineHeight: 40, fontFamily: 'Montserrat_700Bold' },
  subtitle: { color: Palette.textMuted, fontSize: 14, fontStyle: 'italic', marginTop: 4 },
});
