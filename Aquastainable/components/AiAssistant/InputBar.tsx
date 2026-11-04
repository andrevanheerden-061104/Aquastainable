// Message bar for the Fish Assistant.
// Hold the camera bubble to attach a photo/video, hold the arrow to send.
// (Hold timing is the shared "quick" one, so it feels like a firm press.)
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import HoldAction from '@/components/gestures/HoldAction';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

type Props = {
  initialText?: string;
  initialMediaUri?: string | null;
  initialMediaUris?: string[];
  initialMediaType?: 'image' | 'video' | null;
  showOptions?: boolean;
  onShowOptionsChange?: (show: boolean) => void;
  onSend?: (text: string, mediaUri?: string) => void;
  disabled?: boolean;
  draft?: string; // set from outside (starter questions)
};

export default function InputBar({
  initialText = '', initialMediaUri = null, initialMediaUris = [], initialMediaType = null,
  showOptions = false, onShowOptionsChange = () => {}, onSend = () => {}, disabled = false, draft,
}: Props) {
  const [text, setText] = useState(initialText);
  const [media, setMedia] = useState<string | null>(initialMediaUri || initialMediaUris[0] || null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(initialMediaType || (initialMediaUris.length ? 'image' : null));

  useEffect(() => { if (draft !== undefined) setText(draft); }, [draft]);

  const pickMedia = async (source: 'camera' | 'gallery') => {
    try {
      const permission = source === 'camera' ? await Camera.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', source === 'camera' ? 'Please allow camera access.' : 'Please allow photo access.');
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], videoMaxDuration: 5, quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], selectionLimit: 1, quality: 0.9 });
      if (!result.canceled && result.assets?.[0]) {
        setMedia(result.assets[0].uri);
        setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
      }
    } finally {
      onShowOptionsChange(false);
    }
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, media ?? undefined);
    setText('');
    setMedia(null);
    setMediaType(null);
  };

  const canSend = !!text.trim() && !disabled;

  return (
    <View style={styles.wrap}>
      {media ? (
        <View style={styles.attachment}>
          {mediaType === 'image' ? <Image source={{ uri: media }} style={styles.thumb} /> : <View style={[styles.thumb, styles.videoThumb]}><IconSymbol name="camera" size={18} color={Palette.text} /></View>}
          <Text style={styles.attachmentText}>{mediaType === 'video' ? 'Video attached' : 'Photo attached'}</Text>
          <Pressable onPress={() => { setMedia(null); setMediaType(null); }} hitSlop={10} accessibilityLabel="Remove attachment">
            <IconSymbol name="xmark" size={18} color={Palette.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {showOptions ? (
        <View style={styles.options}>
          <HoldAction onComplete={() => pickMedia('camera')} label="Camera" icon={<IconSymbol name="camera" size={18} color={Palette.text} />} style={styles.option} />
          <HoldAction onComplete={() => pickMedia('gallery')} label="Gallery" icon={<IconSymbol name="photo" size={18} color={Palette.text} />} style={styles.option} />
        </View>
      ) : null}

      <View style={styles.bar}>
        <HoldAction
          onComplete={() => onShowOptionsChange(!showOptions)}
          tone="ghost"
          accessibilityLabel="Add a photo or video"
          style={styles.round}
          contentStyle={{ gap: 0 }}
        >
          <IconSymbol name={showOptions ? 'xmark' : 'camera'} size={20} color={Palette.textMuted} />
        </HoldAction>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask about your fish…"
          placeholderTextColor={Palette.textFaint}
          style={styles.input}
          multiline
          maxLength={600}
        />
        <HoldAction
          onComplete={submit}
          tone={canSend ? 'primary' : 'ghost'}
          disabled={!canSend}
          accessibilityLabel="Hold to send"
          style={[styles.round, canSend && styles.sendActive]}
          contentStyle={{ gap: 0 }}
        >
          <IconSymbol name="arrow.up" size={20} color={canSend ? Palette.text : Palette.textFaint} />
        </HoldAction>
      </View>
      {canSend ? <Text style={styles.hint}>Hold the arrow to send</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: Palette.surfaceRaised, borderRadius: 28, padding: 6, borderWidth: 1, borderColor: Palette.border },
  round: { width: 44, height: 44, minHeight: 44, borderRadius: 22, paddingHorizontal: 0 },
  sendActive: { backgroundColor: Palette.primary },
  input: { flex: 1, color: Palette.text, fontSize: 15, minHeight: 44, maxHeight: 120, paddingTop: 12, paddingBottom: 10, paddingHorizontal: 4 },
  hint: { color: Palette.textFaint, fontSize: 11, textAlign: 'right', marginRight: 10 },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1 },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Palette.surface, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: Palette.border },
  thumb: { width: 40, height: 40, borderRadius: 10 },
  videoThumb: { backgroundColor: Palette.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  attachmentText: { flex: 1, color: Palette.textMuted, fontSize: 13 },
});
