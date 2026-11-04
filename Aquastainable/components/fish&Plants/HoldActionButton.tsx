// Kept for existing call sites. Uses the shared HoldAction gesture.
// Red fill colours are treated as destructive: danger tone + the longer "confirm" hold.
import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';

import HoldAction from '@/components/gestures/HoldAction';

type Props = {
  label?: string;
  text?: string; // alias used by tank.tsx
  onHold: () => void;
  fillColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
};

const isDanger = (color?: string) => !!color && /^#(b8|c0|d6|e5|eb|f0|b3|a3)/i.test(color);

export default function HoldActionButton({ label, text, onHold, fillColor, style, textStyle, disabled }: Props) {
  const danger = isDanger(fillColor) || /delete|remove/i.test(label || text || '');
  return (
    <HoldAction
      label={label || text}
      onComplete={onHold}
      tone={danger ? 'danger' : 'primary'}
      speed={danger ? 'confirm' : 'quick'}
      disabled={disabled}
      style={[{ flex: 1, minHeight: 40 }, style]}
      textStyle={[{ fontSize: 13 }, textStyle]}
    />
  );
}
