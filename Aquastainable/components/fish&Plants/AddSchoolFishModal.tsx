// "Add fish to school" bottom sheet.
// Fixed header and fixed "hold to add" bar, with the form scrolling in between
// (no visible scrollbar). Photo sits next to name + age so the form stays short.
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import HoldAction from '@/components/gestures/HoldAction';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

export type FishRecord = {
  id: string;
  name: string;
  age: string;
  health: string;
  description: string;
  schoolStatus: 'new' | 'existing';
  image: number | { uri: string };
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (fish: FishRecord) => void | Promise<void>;
};

type Field = 'image' | 'name' | 'age' | 'story';

const STATUS: { id: 'new' | 'existing'; label: string; icon: string }[] = [
  { id: 'new', label: 'New to school', icon: 'sparkles' },
  { id: 'existing', label: 'Already in school', icon: 'person.3' },
];

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

export default function AddSchoolFishModal({ visible, onClose, onSave }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [story, setStory] = useState('');
  const [schoolStatus, setSchoolStatus] = useState<'new' | 'existing'>('new');
  const [missing, setMissing] = useState<Field[]>([]);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);

  const resetForm = () => {
    setImageUri(null);
    setName('');
    setAge('');
    setStory('');
    setSchoolStatus('new');
    setMissing([]);
    setSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
      setMissing((list) => list.filter((f) => f !== 'image'));
    }
  };

  const handleSave = async () => {
    const empty: Field[] = [];
    if (!imageUri) empty.push('image');
    if (!name.trim()) empty.push('name');
    if (!age.trim()) empty.push('age');
    if (!story.trim()) empty.push('story');
    setMissing(empty);
    if (empty.length || saving) return;

    setSaving(true);
    try {
      await onSave({
        id: `custom-${Date.now()}`,
        name: name.trim(),
        age: age.trim(),
        health: 'Healthy',
        description: story.trim(),
        schoolStatus,
        image: { uri: imageUri as string },
      });
      resetForm();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const clearMissing = (field: Field) => setMissing((list) => list.filter((f) => f !== field));
  const isMissing = (field: Field) => missing.includes(field);
  const inputStyle = (field: Field) => [
    styles.input,
    focused === field && styles.inputFocused,
    isMissing(field) && styles.inputMissing,
    noOutline,
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Add fish to school</Text>
                <Text style={styles.subtitle}>Give this fish its own profile.</Text>
              </View>
              <Pressable onPress={handleClose} style={styles.close} hitSlop={10} accessibilityLabel="Close">
                <IconSymbol name="xmark" size={18} color={Palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.topRow}>
                <Pressable
                  onPress={handlePickImage}
                  style={[styles.photo, isMissing('image') && styles.photoMissing]}
                  accessibilityLabel={imageUri ? 'Change fish photo' : 'Add fish photo'}
                >
                  {imageUri ? (
                    <>
                      <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      <View style={styles.photoBadge}>
                        <IconSymbol name="camera" size={13} color={Palette.text} />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.photoIcon}>
                        <IconSymbol name="camera" size={22} color={Palette.primaryBright} />
                      </View>
                      <Text style={styles.photoText}>Add photo</Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.topFields}>
                  <View>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      value={name}
                      onChangeText={(v) => { setName(v); clearMissing('name'); }}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                      placeholder="e.g. Bubbles"
                      placeholderTextColor={Palette.textFaint}
                      style={inputStyle('name')}
                    />
                  </View>
                  <View>
                    <Text style={styles.label}>Age</Text>
                    <TextInput
                      value={age}
                      onChangeText={(v) => { setAge(v); clearMissing('age'); }}
                      onFocus={() => setFocused('age')}
                      onBlur={() => setFocused(null)}
                      placeholder="e.g. 1.5 yrs"
                      placeholderTextColor={Palette.textFaint}
                      style={inputStyle('age')}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Story</Text>
                <TextInput
                  value={story}
                  onChangeText={(v) => { setStory(v); clearMissing('story'); }}
                  onFocus={() => setFocused('story')}
                  onBlur={() => setFocused(null)}
                  placeholder="Where it came from, its personality, favourite food…"
                  placeholderTextColor={Palette.textFaint}
                  style={[...inputStyle('story'), styles.story]}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>School status</Text>
                <View style={styles.segment}>
                  {STATUS.map((option) => {
                    const active = schoolStatus === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => setSchoolStatus(option.id)}
                        style={[styles.segmentOption, active && styles.segmentActive]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                      >
                        <IconSymbol name={option.icon as any} size={15} color={active ? Palette.text : Palette.textMuted} />
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              {missing.length ? (
                <Text style={styles.missingText}>
                  Add {missing.map((f) => ({ image: 'a photo', name: 'a name', age: 'an age', story: 'a story' })[f]).join(', ')} to save this fish.
                </Text>
              ) : null}
              <HoldAction
                onComplete={handleSave}
                tone="primary"
                disabled={saving}
                label={saving ? 'Adding…' : 'Hold to add fish'}
                icon={<IconSymbol name="plus" size={18} color={Palette.text} />}
                style={styles.saveHold}
                accessibilityLabel="Hold to add fish to school"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,7,10,0.72)', justifyContent: 'flex-end' },
  sheetWrap: { maxHeight: '92%' },
  sheet: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: Palette.borderStrong, marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 12 },
  title: { color: Palette.text, fontSize: 22, fontFamily: 'Montserrat_700Bold' },
  subtitle: { color: Palette.textMuted, fontSize: 13, marginTop: 4 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: Palette.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 22, paddingBottom: 8, gap: 18 },
  topRow: { flexDirection: 'row', gap: 14 },
  photo: {
    width: 128,
    height: 148,
    borderRadius: 20,
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  photoMissing: { borderColor: Palette.dangerBorder },
  photoIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  photoText: { color: Palette.text, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' },
  photoBadge: {
    position: 'absolute', right: 8, bottom: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(12,14,18,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  topFields: { flex: 1, justifyContent: 'space-between', gap: 10 },
  field: { gap: 0 },
  label: { color: Palette.textMuted, fontSize: 12, fontFamily: 'Montserrat_600SemiBold', marginBottom: 7 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Palette.surfaceRaised,
    color: Palette.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    fontSize: 15,
  },
  inputFocused: { borderColor: Palette.primaryBorder },
  inputMissing: { borderColor: Palette.dangerBorder },
  story: { minHeight: 104, lineHeight: 21 },
  segment: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 16, backgroundColor: Palette.surfaceSunken, borderWidth: 1, borderColor: Palette.border },
  segmentOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44, borderRadius: 12, paddingHorizontal: 8 },
  segmentActive: { backgroundColor: Palette.primary },
  segmentText: { color: Palette.textMuted, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' },
  segmentTextActive: { color: Palette.text },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 26, gap: 10, borderTopWidth: 1, borderTopColor: Palette.border, backgroundColor: Palette.surface },
  missingText: { color: Palette.dangerText, fontSize: 12, textAlign: 'center' },
  saveHold: { minHeight: 54, borderRadius: 18 },
});
