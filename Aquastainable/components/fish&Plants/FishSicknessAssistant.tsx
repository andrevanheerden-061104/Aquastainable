import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/lib/colors';
import SwipeCheckButton from './SwipeCheckButton';
import HoldAction from '@/components/gestures/HoldAction';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';

export type FishSicknessPrefill = {
  text: string;
  mediaUris: string[];
  speciesName: string;
};

type Props = {
  speciesName: string;
  onSendToAI: (prefill: FishSicknessPrefill) => void;
};

const HOLD_DURATION = 200;

export default function FishSicknessAssistant({ speciesName, onSendToAI }: Props) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [notes, setNotes] = useState(`A ${speciesName} in the school is showing white spots and strange behavior.`);
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const intervalRef = useRef<number | null>(null);
  const openModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTriggeredRef = useRef(false);
  const holdStartRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      if (openModalTimerRef.current) {
        clearTimeout(openModalTimerRef.current);
      }
    };
  }, []);

  const startHold = () => {
    if (isHolding) {
      return;
    }

    setIsHolding(true);
    setHoldProgress(0);
    holdTriggeredRef.current = false;
    holdStartRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(1, elapsed / HOLD_DURATION);
      setHoldProgress(progress);

      if (progress >= 1) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsHolding(false);
        setHoldProgress(0);
        holdTriggeredRef.current = true;
        openModalTimerRef.current = setTimeout(() => {
          openModalTimerRef.current = null;
          setModalVisible(true);
        }, 50);
      }
    }, 16) as unknown as number;
  };

  const cancelHold = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!holdTriggeredRef.current && openModalTimerRef.current) {
      clearTimeout(openModalTimerRef.current);
      openModalTimerRef.current = null;
    }
    holdTriggeredRef.current = false;
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handlePickMedia = async (mode: 'camera' | 'gallery') => {
    const permission = mode === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your photos to attach an image or video.');
      return;
    }

    let result;
    if (mode === 'camera') {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        base64: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, 3 - mediaUris.length),
        quality: 0.8,
        allowsEditing: false,
        base64: true,
      });
    }

    if (!result.canceled && result.assets?.[0]) {
      const selectedUris = result.assets.map((asset) => asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri).filter(Boolean);
      setMediaUris((current) => [...current, ...selectedUris].slice(0, 3));
    }
  };

  const handleSend = () => {
    onSendToAI({ text: notes, mediaUris, speciesName });
    setModalVisible(false);
    setMediaUris([]);
    setNotes(`A ${speciesName} in the school is showing white spots and strange behavior.`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headRow}>
        <View style={styles.headIcon}>
          <IconSymbol name="cross.case" size={20} color={Palette.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Fish looking unwell?</Text>
          <Text style={styles.sectionSubtitle}>Describe what you see, add a photo, and get a quick answer on what it is and how to treat it.</Text>
        </View>
      </View>

      <HoldAction
        onComplete={() => setModalVisible(true)}
        label="Hold to start a sickness report"
        icon={<IconSymbol name="stethoscope" size={18} color={Palette.text} />}
        accessibilityLabel="Hold to start a sickness report"
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sickness report</Text>
            <Text style={styles.modalDescription}>Describe the fish behavior and attach up to three photos.</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Describe the white fish and its behavior..."
              placeholderTextColor="#6E7684"
              multiline
              style={styles.notesInput}
            />
            <View style={styles.mediaRow}>
              <TouchableOpacity style={styles.mediaButton} onPress={() => handlePickMedia('camera')}>
                <Text style={styles.mediaButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaButton} onPress={() => handlePickMedia('gallery')}>
                <Text style={styles.mediaButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            {mediaUris.length ? (
              <View style={styles.mediaPreview}>
                <View style={styles.previewRow}>{mediaUris.map((uri) => <Image key={uri} source={{ uri }} style={styles.previewImage} />)}</View>
                <Text style={styles.mediaLabel}>{mediaUris.length} photo{mediaUris.length === 1 ? '' : 's'} attached</Text>
              </View>
            ) : null}
            <SwipeCheckButton label="Swipe to send to AI" onSwipe={handleSend} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    padding: 18,
    gap: 16,
    borderRadius: 24,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  headRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  headIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    color: Palette.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: Palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  holdButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  holdProgressBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
  },
  holdProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.waterFill,
    borderRadius: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 12, 21, 0.75)',
    justifyContent: 'center',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    backgroundColor: '#121212',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalDescription: {
    color: '#B3B9C9',
    fontSize: 14,
    marginBottom: 18,
  },
  notesInput: {
    minHeight: 100,
    borderRadius: 18,
    backgroundColor: '#14151B',
    color: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mediaButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mediaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  mediaPreview: {
    marginBottom: 18,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  previewImage: {
    flex: 1,
    height: 180,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 4,
  },
  mediaLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    padding: 12,
    backgroundColor: '#0F1219',
  },
});
