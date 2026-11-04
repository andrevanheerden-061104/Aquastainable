// Glass input with an icon and an optional show/hide toggle for passwords.
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

type Props = TextInputProps & { icon: 'envelope' | 'lock' | 'person'; secret?: boolean };

export default function AuthField({ icon, secret, style, ...input }: Props) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <IconSymbol name={icon as any} size={18} color={focused ? Palette.primaryBright : Palette.textFaint} />
      <TextInput
        {...input}
        secureTextEntry={secret ? hidden : false}
        placeholderTextColor={Palette.textFaint}
        onFocus={(event) => { setFocused(true); input.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); input.onBlur?.(event); }}
        style={[styles.input, style]}
      />
      {secret ? (
        <Pressable onPress={() => setHidden((value) => !value)} hitSlop={10} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
          <IconSymbol name={(hidden ? 'eye' : 'eye.slash') as any} size={18} color={Palette.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, paddingHorizontal: 16,
    borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  wrapFocused: { borderColor: Palette.primaryBorder, backgroundColor: 'rgba(46,140,166,0.08)' },
  input: { flex: 1, color: Palette.text, fontSize: 15, height: '100%', outlineStyle: 'none' } as any,
});
