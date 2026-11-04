// Tank page header: back + hold to edit (shared HoldAction gesture).
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import HoldAction from '@/components/gestures/HoldAction';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

type Props = {
  onBack: () => void;
  onMenu: () => void;
};

export default function HeaderRow({ onBack, onMenu }: Props) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} style={styles.back} hitSlop={10} accessibilityLabel="Go back">
        <IconSymbol name="chevron.right" size={22} color={Palette.text} style={{ transform: [{ rotate: '180deg' }] }} />
      </Pressable>
      <HoldAction
        onComplete={onMenu}
        label="Edit"
        accessibilityLabel="Hold to edit tank"
        icon={<IconSymbol name="pencil" size={16} color={Palette.text} />}
        style={styles.edit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.surfaceRaised },
  edit: { minHeight: 40, paddingHorizontal: 14 },
});
