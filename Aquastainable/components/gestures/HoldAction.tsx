// One shared "hold" gesture for the whole app (the no-traditional-buttons rule).
//
// - Press and hold: a ripple spreads out from your finger like a drop in water.
//   When it fills the shape, the action fires.
// - Two fixed timings so the app feels consistent:
//     quick   (350 ms) normal actions: open, save, send
//     confirm (750 ms) destructive actions: delete, log out
// - Light haptic tick on touch, success haptic when it fires.
// - Runs on the UI thread (Reanimated), so it doesn't stutter while the app is busy.
// - Screen readers: double-tap activates it (accessibilityActions), so gesture-only
//   doesn't lock anyone out.
import * as Haptics from 'expo-haptics';
import React, { ReactNode, useCallback, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Palette } from '@/constants/palette';

export const HOLD_MS = { quick: 350, confirm: 750 } as const;
export type HoldSpeed = keyof typeof HOLD_MS;
export type HoldTone = 'default' | 'primary' | 'danger' | 'ghost';

const TONES: Record<HoldTone, { bg: string; border: string; ripple: string; text: string }> = {
  default: { bg: Palette.surfaceRaised, border: Palette.border, ripple: Palette.rippleWater, text: Palette.text },
  primary: { bg: Palette.primarySoft, border: Palette.primaryBorder, ripple: Palette.ripplePrimary, text: Palette.text },
  danger: { bg: Palette.dangerSoft, border: Palette.dangerBorder, ripple: Palette.rippleDanger, text: Palette.dangerText },
  ghost: { bg: 'transparent', border: 'transparent', ripple: Palette.rippleWater, text: Palette.text },
};

type Props = {
  onComplete: () => void;
  label?: string;
  icon?: ReactNode;
  children?: ReactNode;
  tone?: HoldTone;
  speed?: HoldSpeed;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

const haptic = (kind: 'tick' | 'done') => {
  if (Platform.OS === 'web') return;
  if (kind === 'tick') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
};

export default function HoldAction({
  onComplete, label, icon, children, tone = 'default', speed = 'quick', disabled = false,
  style, contentStyle, textStyle, accessibilityLabel, testID,
}: Props) {
  const colors = TONES[tone];
  const duration = HOLD_MS[speed];
  const [size, setSize] = useState({ w: 0, h: 0 });
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  const fire = useCallback(() => {
    haptic('done');
    onComplete();
  }, [onComplete]);

  const gesture = Gesture.LongPress()
    .minDuration(duration)
    .maxDistance(24)
    .enabled(!disabled)
    .runOnJS(true)
    .onBegin((event) => {
      originX.value = event.x;
      originY.value = event.y;
      progress.value = 0;
      progress.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
      pulse.value = withTiming(0.97, { duration: 120 });
      haptic('tick');
    })
    .onStart(() => {
      pulse.value = withSequence(withTiming(1.03, { duration: 110 }), withTiming(1, { duration: 140 }));
      fire();
    })
    .onFinalize((_event, success) => {
      if (!success) pulse.value = withTiming(1, { duration: 120 });
      progress.value = withTiming(0, { duration: success ? 420 : 180 });
    });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  // Ripple big enough to cover the whole shape from any touch point.
  const diameter = Math.max(1, Math.hypot(size.w, size.h) * 2);

  const rippleStyle = useAnimatedStyle(() => ({
    left: originX.value - diameter / 2,
    top: originY.value - diameter / 2,
    opacity: progress.value === 0 ? 0 : 0.35 + progress.value * 0.45,
    transform: [{ scale: progress.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={onLayout}
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint="Press and hold to activate"
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'activate' && !disabled) fire(); }}
        style={[
          styles.base,
          { backgroundColor: colors.bg, borderColor: colors.border },
          disabled && styles.disabled,
          style,
          containerStyle,
        ]}
      >
        <Animated.View
          style={[styles.ripple, { width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: colors.ripple }, rippleStyle, { pointerEvents: 'none' }]}
        />
        <View style={[styles.content, contentStyle, { pointerEvents: 'none' }]}>
          {children ?? (
            <>
              {icon}
              {label ? <Text style={[styles.label, { color: colors.text }, textStyle]} numberOfLines={1}>{label}</Text> : null}
            </>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.45 },
  ripple: { position: 'absolute' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 1 },
  label: { fontSize: 14, fontFamily: 'Montserrat_600SemiBold', letterSpacing: 0.2 },
});
