// Full-screen loading overlay: dims the screen, spinning ring around the logo,
// a soft pulse, and a short message. Blocks touches while visible.
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Palette } from '@/constants/palette';

type Props = { visible: boolean; message?: string };

const SIZE = 84;

export default function LoadingOverlay({ visible, message = 'One moment…' }: Props) {
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    spin.value = 0;
    pulse.value = 0;
    spin.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1);
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1);
  }, [visible, spin, pulse]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.6 }] }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(220)}
      style={styles.overlay}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <View style={styles.card}>
        <View style={styles.center}>
          <Animated.View style={[styles.pulse, pulseStyle]} />
          <View style={styles.track} />
          <Animated.View style={[styles.ring, ringStyle]} />
          <Image source={require('../../assets/logo/Aque-logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    backgroundColor: 'rgba(5,7,10,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center', gap: 20, paddingVertical: 28, paddingHorizontal: 36, borderRadius: 28,
    backgroundColor: 'rgba(23,26,33,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  center: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: Palette.primary },
  track: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3, borderColor: 'rgba(255,255,255,0.08)' },
  ring: {
    position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3,
    borderColor: 'transparent', borderTopColor: Palette.primaryBright, borderRightColor: Palette.primaryBright,
  },
  logo: { width: 38, height: 38 },
  message: { color: Palette.text, fontSize: 15, fontFamily: 'Montserrat_600SemiBold', letterSpacing: 0.3 },
});
