// Shared layout for Sign in / Create account.
// Full-bleed fish photo that fades into the dark background, a faint brand word
// behind it, a two-weight headline, and a glass card holding the form.
import { useRouter } from 'expo-router';
import React, { ReactNode } from 'react';
import { Image, ImageSourcePropType, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Fade from '@/components/ui/Fade';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import { Palette } from '@/constants/palette';

type Props = {
  hero: ImageSourcePropType;
  heroPosition?: 'top' | 'center';
  heroShift?: number; // move the photo up (negative) or down, in px
  titleLight: string;
  titleBold: string;
  subtitle: string;
  mode: 'signin' | 'signup';
  loading?: boolean;
  loadingMessage?: string;
  children: ReactNode;
};

export default function AuthLayout({ hero, heroPosition = 'center', heroShift = 0, titleLight, titleBold, subtitle, mode, loading = false, loadingMessage, children }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const go = (target: 'signin' | 'signup') => {
    if (target !== mode) router.replace(target === 'signin' ? '/signin' : '/signup');
  };

  return (
    <View style={styles.screen}>
      {/* Hero photo + fade */}
      <View style={styles.hero} pointerEvents="none">
        <Image source={hero} style={[styles.heroImage, heroPosition === 'top' && styles.heroTop, heroShift ? { transform: [{ translateY: heroShift }] } : null]} resizeMode="cover" />
        <Fade stops={[
          { offset: 0, color: '#06080B', opacity: 0.55 },
          { offset: 0.25, color: '#06080B', opacity: heroPosition === 'top' ? 0.15 : 0 },
          { offset: 0.6, color: '#06080B', opacity: heroPosition === 'top' ? 0.6 : 0.25 },
          { offset: 1, color: '#0B0D11', opacity: 1 },
        ]} />
        <Text style={[styles.watermark, { top: insets.top + 54 }]} numberOfLines={1}>AQUA</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.brandRow}>
            <Image source={require('../../assets/logo/Aque-logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brand}>Aquastainable</Text>
          </Animated.View>

          <View style={styles.flex} />

          <Animated.View entering={FadeInUp.duration(450).delay(80)}>
            <Text style={styles.titleLight}>{titleLight}</Text>
            <Text style={styles.titleBold}>{titleBold}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(450).delay(160)} style={styles.card}>
            <View style={styles.switch} accessibilityRole="tablist">
              {(['signin', 'signup'] as const).map((item) => {
                const active = item === mode;
                return (
                  <Pressable
                    key={item}
                    onPress={() => go(item)}
                    style={[styles.switchItem, active && styles.switchItemActive]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.switchText, active && styles.switchTextActive]}>{item === 'signin' ? 'Sign in' : 'Create account'}</Text>
                  </Pressable>
                );
              })}
            </View>
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={loading} message={loadingMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#0B0D11' },
  hero: { ...StyleSheet.absoluteFill, bottom: '30%', overflow: 'hidden', backgroundColor: '#000' },
  heroImage: { width: '100%', height: '100%' },
  heroTop: { height: '115%', top: '-8%' },
  watermark: {
    position: 'absolute', left: -6, right: -6, textAlign: 'center',
    color: 'rgba(255,255,255,0.07)', fontSize: 88, letterSpacing: 10, fontFamily: 'Montserrat_700Bold',
  },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 28, height: 28 },
  brand: { color: Palette.text, fontSize: 16, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.4 },
  titleLight: { color: 'rgba(244,246,248,0.85)', fontSize: 32, lineHeight: 38, fontFamily: 'Montserrat_400Regular' },
  titleBold: { color: Palette.text, fontSize: 34, lineHeight: 40, fontFamily: 'Montserrat_700Bold' },
  subtitle: { color: Palette.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 18, maxWidth: 320 },
  card: {
    backgroundColor: 'rgba(23,26,33,0.72)', borderRadius: 28, padding: 14, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  switch: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, padding: 4, marginBottom: 4 },
  switchItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  switchItemActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  switchText: { color: Palette.textFaint, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' },
  switchTextActive: { color: Palette.text },
});
