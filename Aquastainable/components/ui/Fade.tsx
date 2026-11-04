// Vertical gradient overlay (react-native-svg, so no extra package is needed).
import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Stop_ = { offset: number; color: string; opacity: number };

export default function Fade({ stops, style }: { stops: Stop_[]; style?: StyleProp<ViewStyle> }) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg pointerEvents="none" style={[StyleSheet.absoluteFill, style]} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map((stop) => <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />)}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
