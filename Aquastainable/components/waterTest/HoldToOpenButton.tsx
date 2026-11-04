// Uses the shared HoldAction gesture.
import React from 'react';

import HoldAction from '@/components/gestures/HoldAction';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

type Props = {
  onHold: () => void;
  label?: string;
};

export default function HoldToOpenButton({ onHold, label = 'Hold to add water test' }: Props) {
  return (
    <HoldAction
      onComplete={onHold}
      label={label}
      tone="primary"
      icon={<IconSymbol name="drop.fill" size={18} color={Palette.primaryBright} />}
      style={{ marginTop: 20, marginHorizontal: 20, minHeight: 54 }}
    />
  );
}
