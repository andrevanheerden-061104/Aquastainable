// Compatibility result pop-up for adding a fish or plant. Uses the shared ResultSheet:
// big status icon, title, explanation, school-size stats and the actions as gestures.
import React from 'react';

import HoldAction from '@/components/gestures/HoldAction';
import SwipeToConfirm from '@/components/gestures/SwipeToConfirm';
import ResultSheet, { ResultTone } from '@/components/kit/ResultSheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

type Analysis = {
  title?: string;
  details?: string;
  explanation?: string;
  success?: boolean;
  unlock?: boolean;
  canAdd?: boolean;
  status?: string;
  optimalSchoolSize?: string;
  maximumSchoolSize?: string;
  suggestedTankId?: string | null;
  suggestedTankName?: string;
  suggestedPlantName?: string;
};

type Props = {
  visible: boolean;
  analysis: Analysis | null;
  typeLabel: 'fish' | 'plant';
  onClose: () => void;
  onSwipeToAdd: () => void;
  onAssignSuggested?: () => void;
  onUseOptimalSchoolSize?: () => void;
  onSelectSuggestedPlant?: () => void | Promise<void>;
};

export default function CompatibilityResultModal({ visible, analysis, typeLabel, onClose, onSwipeToAdd, onAssignSuggested, onUseOptimalSchoolSize, onSelectSuggestedPlant }: Props) {
  const canAdd = analysis?.canAdd ?? analysis?.unlock ?? false;
  const needsInfo = analysis?.status === 'needs_information';
  const tone: ResultTone = canAdd ? 'success' : needsInfo ? 'warning' : 'danger';
  const eyebrow = canAdd ? 'Compatible' : needsInfo ? 'Need more info' : 'Not compatible';

  const stats = [
    ...(analysis?.optimalSchoolSize ? [{ label: 'Best group', value: String(analysis.optimalSchoolSize) }] : []),
    ...(analysis?.maximumSchoolSize ? [{ label: 'Maximum', value: String(analysis.maximumSchoolSize) }] : []),
  ];

  return (
    <ResultSheet
      visible={visible}
      tone={tone}
      eyebrow={eyebrow}
      title={analysis?.title ?? 'Compatibility result'}
      message={analysis?.explanation ?? analysis?.details ?? 'No analysis available.'}
      stats={stats}
      onClose={onClose}
    >
      {!canAdd && analysis?.suggestedPlantName && onSelectSuggestedPlant ? (
        <HoldAction
          onComplete={() => { void onSelectSuggestedPlant(); }}
          tone="primary"
          label={`Try ${analysis.suggestedPlantName} instead`}
          icon={<IconSymbol name="leaf" size={16} color={Palette.text} />}
        />
      ) : null}
      {!canAdd && analysis?.optimalSchoolSize && onUseOptimalSchoolSize ? (
        <HoldAction
          onComplete={onUseOptimalSchoolSize}
          tone="primary"
          label={`Use a group of ${analysis.optimalSchoolSize}`}
          icon={<IconSymbol name="person.3" size={16} color={Palette.text} />}
        />
      ) : null}
      {!canAdd && analysis?.suggestedTankId && onAssignSuggested ? (
        <HoldAction
          onComplete={onAssignSuggested}
          tone="primary"
          label={`Move to ${analysis.suggestedTankName || 'suggested tank'}`}
          icon={<IconSymbol name="water.waves" size={16} color={Palette.text} />}
        />
      ) : null}
      <SwipeToConfirm
        label={canAdd ? `Swipe to add ${typeLabel}` : 'Swipe to go back'}
        onConfirm={canAdd ? onSwipeToAdd : onClose}
        tone={canAdd ? 'primary' : 'glass'}
      />
    </ResultSheet>
  );
}
