// Kept for existing call sites. Uses the shared SwipeToConfirm gesture.
import React from 'react';

import SwipeToConfirm from '@/components/gestures/SwipeToConfirm';

type Props = {
  onSwipe: () => void;
  label?: string;
  disabled?: boolean;
};

export default function SwipeCheckButton({ onSwipe, label = 'Swipe to check compatibility', disabled = false }: Props) {
  return <SwipeToConfirm label={label} onConfirm={onSwipe} disabled={disabled} />;
}
