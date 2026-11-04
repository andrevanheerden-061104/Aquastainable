// Kept for existing call sites. Uses the shared HoldAction gesture.
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import HoldAction, { HoldSpeed, HoldTone } from '@/components/gestures/HoldAction';

type Props = {
  children: React.ReactNode;
  onHold: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  activeOpacity?: number; // ignored, kept for compatibility
  accessibilityLabel?: string;
  tone?: HoldTone;
  speed?: HoldSpeed;
};

export default function HoldButton({ children, onHold, style, disabled = false, accessibilityLabel, tone = 'default', speed = 'quick' }: Props) {
  return (
    <HoldAction onComplete={onHold} style={style} disabled={disabled} accessibilityLabel={accessibilityLabel} tone={tone} speed={speed}>
      {children}
    </HoldAction>
  );
}
