// Swipe the bubble to the end of the track to confirm (sign in, open tank info,
// check compatibility...). Built on Gesture Handler + Reanimated.
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

const THUMB = 52;
const PAD = 4;

type Props = {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'glass';
  style?: StyleProp<ViewStyle>;
};

const buzz = () => {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
};

export default function SwipeToConfirm({ label, onConfirm, disabled = false, loading = false, tone = 'primary', style }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const max = Math.max(0, trackWidth - THUMB - PAD * 2);
  const x = useSharedValue(0);

  const confirm = () => {
    buzz();
    onConfirm();
  };

  const pan = Gesture.Pan()
    .enabled(!disabled && !loading)
    .activeOffsetX([-6, 6])
    .onUpdate((event) => {
      x.value = Math.min(max, Math.max(0, event.translationX));
    })
    .onEnd(() => {
      if (x.value > max * 0.8) {
        x.value = withTiming(max, { duration: 90 }, () => {
          runOnJS(confirm)();
          x.value = withSpring(0, { damping: 16 });
        });
      } else {
        x.value = withSpring(0, { damping: 16 });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB + PAD }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, Math.max(1, max * 0.6)], [1, 0], Extrapolation.CLAMP),
  }));

  const glass = tone === 'glass';

  return (
    <View
      style={[styles.track, glass ? styles.trackGlass : styles.trackPrimary, (disabled || loading) && styles.disabled, style]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Swipe right to confirm"
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'activate' && !disabled && !loading) confirm(); }}
    >
      <Animated.View style={[styles.fill, fillStyle, { pointerEvents: 'none' }]} />
      <Animated.Text style={[styles.label, labelStyle, { pointerEvents: 'none' }]}>{loading ? 'One moment…' : label}</Animated.Text>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.thumb, thumbStyle]} hitSlop={12}>
          {loading ? <ActivityIndicator color="#fff" /> : <IconSymbol name="chevron.right" size={26} color="#FFFFFF" />}
        </Animated.View>
      </GestureDetector>
      {trackWidth > 280 && label.length <= 18 ? (
        <View style={[styles.hintArrows, { pointerEvents: 'none' }]}>
          <Text style={styles.hintText}>›››</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: THUMB + PAD * 2, borderRadius: 999, padding: PAD, justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  trackPrimary: { backgroundColor: Palette.primarySoft, borderColor: Palette.primaryBorder },
  trackGlass: { backgroundColor: 'rgba(12,14,18,0.55)', borderColor: 'rgba(255,255,255,0.18)' },
  disabled: { opacity: 0.5 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, backgroundColor: 'rgba(79,179,204,0.28)' },
  label: { position: 'absolute', left: THUMB + PAD * 2, right: 26, textAlign: 'center', color: Palette.text, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Montserrat_700Bold' },
  thumb: {
    width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: Palette.primary, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 2px 10px rgba(46, 140, 166, 0.5)' },
  hintArrows: { position: 'absolute', right: 18 },
  hintText: { color: 'rgba(255,255,255,0.35)', fontSize: 18, letterSpacing: 2 },
});
