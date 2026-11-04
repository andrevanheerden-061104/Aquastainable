// @ts-nocheck
// Dashboard: one tank at a time, full-screen photo.
// Gestures: swipe up/down = next/previous tank, swipe the bubble = open tank details,
// hold + = add a tank, swipe in from the left edge = menu.
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import HoldAction from '@/components/gestures/HoldAction';
import SwipeToConfirm from '@/components/gestures/SwipeToConfirm';
import Fade from '@/components/ui/Fade';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WaterChangeToast from '@/components/WaterChangeToast';
import { Palette, qualityTone } from '@/constants/palette';
import { auth } from '@/firebase';

import { useTankApi } from '@/lib/hooks/useTankApi';
import useWaterTestApi from '@/lib/hooks/useWaterTestApi';

const SIZE_PRESETS = ['20', '50', '100', '200'];

const daysSince = (iso?: string) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return Number.isFinite(days) ? Math.max(0, days) : null;
};

const lastTestLabel = (days: number | null) => {
  if (days === null) return 'Never';
  if (days === 0) return 'Today';
  return `${days}d ago`;
};

// The AI overview is 1-2 short sentences; show it as the tank's quick verdict.
const firstTip = (overview?: string) => {
  if (!overview) return '';
  const text = overview.replace(/^[-*•#\s]+/gm, '').replace(/\s+/g, ' ').trim();
  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
};

export default function HomeScreen() {
  const router = useRouter();
  const { createTank, getUserTanks, loading } = useTankApi();
  const { getTankWaterTests } = useWaterTestApi();
  const [tanks, setTanks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [latestTests, setLatestTests] = useState<Record<string, any>>({});
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const tanksRef = useRef<any[]>([]);
  const [form, setForm] = useState({ tankName: '', tankImg: '', waterType: 'Freshwater', tankSize: '50' });

  useEffect(() => onAuthStateChanged(auth, (user) => setCurrentUserId(user?.uid ?? null)), []);

  const loadTanks = useCallback(async () => {
    if (!currentUserId) {
      setTanks([]);
      tanksRef.current = [];
      return;
    }
    try {
      const response = await getUserTanks(currentUserId);
      const nextTanks = Array.isArray(response) ? response : [];
      tanksRef.current = nextTanks;
      setTanks(nextTanks);
      setActiveIndex((index) => Math.min(index, Math.max(0, nextTanks.length - 1)));
      // Latest water test per tank, for the status + stats on each card.
      const entries = await Promise.all(nextTanks.map(async (tank) => {
        const id = String(tank.tankId || tank.id);
        const tests = await getTankWaterTests(id).catch(() => []);
        const latest = [...tests].sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime())[0];
        return [id, latest];
      }));
      setLatestTests(Object.fromEntries(entries));
    } catch {
      setTanks([]);
      tanksRef.current = [];
    } finally {
      setLoaded(true);
    }
  }, [currentUserId, getTankWaterTests, getUserTanks]);

  useFocusEffect(useCallback(() => { void loadTanks(); }, [loadTanks]));

  const step = (direction: 1 | -1) => {
    const count = tanksRef.current.length;
    if (count < 2) return;
    setActiveIndex((prev) => (prev + direction + count) % count);
  };

  // Vertical swipe anywhere on the photo switches tanks.
  const tankSwipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-24, 24])
    .failOffsetX([-18, 18])
    .onEnd((event) => {
      if (event.translationY < -50 || event.velocityY < -600) step(1);
      else if (event.translationY > 50 || event.velocityY > 600) step(-1);
    });

  const aquarium = tanks[activeIndex];
  const tankId = aquarium ? String(aquarium.tankId || aquarium.id) : '';
  const latest = latestTests[tankId];
  const readings = latest?.readings || {};
  const quality = qualityTone(latest?.waterQuality || aquarium?.waterQuality);
  const days = daysSince(latest?.testedAt || aquarium?.testDate);
  const temp = readings.temperatureC || readings.temperature || aquarium?.temperatureC;
  const ph = readings.ph || readings.pH || aquarium?.ph;
  const tip = firstTip(aquarium?.overview);

  const openTank = () => router.push({ pathname: '/(tabs)/tank/[id]', params: { id: tankId } });

  const resetForm = () => setForm({ tankName: '', tankImg: '', waterType: 'Freshwater', tankSize: '50' });

  const handlePickTankImage = async (source: 'library' | 'camera') => {
    try {
      const pickerResult = source === 'library'
        ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8, base64: true })
        : await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8, base64: true });
      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;
      const asset = pickerResult.assets[0];
      setForm((prev) => ({ ...prev, tankImg: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri }));
    } catch {
      Alert.alert('Image error', 'Unable to pick an image right now.');
    }
  };

  const handleCreateTank = async () => {
    if (!currentUserId) {
      Alert.alert('Login required', 'Please sign in before creating a tank.');
      return;
    }
    if (!form.tankName.trim() || !form.tankSize) {
      Alert.alert('Missing details', 'Give your tank a name and a size.');
      return;
    }
    try {
      await createTank({
        user_id: currentUserId,
        tankName: form.tankName.trim(),
        tankImg: form.tankImg.trim(),
        waterType: form.waterType.trim() || 'Freshwater',
        tankSize: Number(form.tankSize),
        overview: '',
        aquaCare: {},
      });
      setIsAddModalVisible(false);
      resetForm();
      await loadTanks();
      setActiveIndex(tanksRef.current.length - 1);
    } catch (error) {
      Alert.alert('Could not create tank', error.message || 'Please try again.');
    }
  };

  const addButton = (
    <HoldAction
      onComplete={() => setIsAddModalVisible(true)}
      tone="primary"
      accessibilityLabel="Add a new tank"
      style={styles.addBubble}
      contentStyle={{ gap: 0 }}
    >
      <IconSymbol name="plus" size={26} color={Palette.text} />
    </HoldAction>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {aquarium ? (
        <GestureDetector gesture={tankSwipe}>
          <View style={styles.flex}>
            <Animated.View key={tankId} entering={FadeIn.duration(320)} style={StyleSheet.absoluteFill}>
              <ImageBackground source={aquarium.tankImg ? { uri: aquarium.tankImg } : undefined} style={styles.flex} resizeMode="cover">
                <Fade stops={[
                  { offset: 0, color: '#05070A', opacity: 0.65 },
                  { offset: 0.25, color: '#05070A', opacity: 0.05 },
                  { offset: 0.5, color: '#05070A', opacity: 0.15 },
                  { offset: 1, color: '#05070A', opacity: 0.96 },
                ]} />
              </ImageBackground>
            </Animated.View>

            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
              <View style={styles.topBar}>
                <View style={styles.brandRow}>
                  <Image source={require('../../assets/logo/Aque-logo.png')} style={styles.logo} resizeMode="contain" />
                  <Text style={styles.brand}>Aquastainable</Text>
                </View>
                {tanks.length > 1 ? (
                  <View style={styles.pager}>
                    {tanks.map((tank, index) => (
                      <View key={String(tank.tankId || tank.id)} style={[styles.pagerDot, index === activeIndex && styles.pagerDotActive]} />
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.flex} />

              <Animated.View key={`sheet-${tankId}`} entering={FadeInDown.duration(360)} style={styles.sheet}>
                <View style={styles.sheetHead}>
                  <View style={[styles.statusPill, { backgroundColor: quality.soft }]}>
                    <View style={[styles.statusDot, { backgroundColor: quality.color }]} />
                    <Text style={[styles.statusText, { color: quality.color }]}>{quality.label}</Text>
                  </View>
                  {tanks.length > 1 ? <Text style={styles.counter}>{activeIndex + 1} of {tanks.length}</Text> : null}
                </View>

                <Text style={styles.tankName} numberOfLines={1}>{aquarium.tankName}</Text>
                <Text style={styles.tankMeta}>{aquarium.waterType || 'Freshwater'} · {Number(aquarium.tankSize || 0)} L</Text>

                <View style={styles.stats}>
                  <Stat icon="thermometer" label="Temp" value={temp ? `${temp}°C` : '–'} />
                  <Stat icon="drop.fill" label="pH" value={ph || '–'} />
                  <Stat icon="clock" label="Last test" value={lastTestLabel(days)} warn={days === null || days > 7} />
                </View>

                {tip ? (
                  <View style={styles.tip}>
                    <IconSymbol name="sparkles" size={16} color={Palette.accent} />
                    <Text style={styles.tipText} numberOfLines={4}>{tip}</Text>
                  </View>
                ) : null}

                <View style={styles.actionsRow}>
                  <SwipeToConfirm label="Swipe for details" onConfirm={openTank} tone="glass" style={styles.flex} />
                  {addButton}
                </View>

                {tanks.length > 1 ? (
                  <View style={styles.swipeHint}>
                    <IconSymbol name="chevron.down" size={16} color={Palette.textFaint} style={{ transform: [{ rotate: '180deg' }] }} />
                    <Text style={styles.swipeHintText}>Swipe up for your next tank</Text>
                  </View>
                ) : null}
              </Animated.View>
            </SafeAreaView>
          </View>
        </GestureDetector>
      ) : (
        <SafeAreaView style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Image source={require('../../assets/logo/Aque-logo.png')} style={{ width: 54, height: 54 }} resizeMode="contain" />
          </View>
          <Text style={styles.emptyTitle}>{loaded ? 'Add your first tank' : 'Loading your tanks…'}</Text>
          <Text style={styles.emptyText}>
            {loaded ? 'Snap a photo of your aquarium, give it a name and size, and we will help you look after it.' : 'One moment.'}
          </Text>
          {loaded ? (
            <HoldAction
              onComplete={() => setIsAddModalVisible(true)}
              tone="primary"
              label="Hold to add a tank"
              icon={<IconSymbol name="plus" size={20} color={Palette.text} />}
              style={{ alignSelf: 'stretch', minHeight: 56 }}
            />
          ) : null}
        </SafeAreaView>
      )}

      <WaterChangeToast />

      <Modal visible={isAddModalVisible} transparent animationType="slide" onRequestClose={() => setIsAddModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsAddModalVisible(false)} accessibilityLabel="Close" />
          <View style={styles.modalCard}>
            <View style={styles.grabber} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New tank</Text>
              <Text style={styles.modalSub}>Tap outside to close.</Text>

              <Text style={styles.label}>Photo</Text>
              {form.tankImg ? (
                <Image source={{ uri: form.tankImg }} style={styles.preview} resizeMode="cover" />
              ) : null}
              <View style={styles.row}>
                <HoldAction onComplete={() => handlePickTankImage('library')} label="Gallery" icon={<IconSymbol name="photo" size={18} color={Palette.text} />} style={styles.flex} />
                <HoldAction onComplete={() => handlePickTankImage('camera')} label="Camera" icon={<IconSymbol name="camera" size={18} color={Palette.text} />} style={styles.flex} />
              </View>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Guppy Kingdom"
                placeholderTextColor={Palette.textFaint}
                value={form.tankName}
                onChangeText={(value) => setForm((prev) => ({ ...prev, tankName: value }))}
              />

              <Text style={styles.label}>Size (litres)</Text>
              <View style={styles.row}>
                {SIZE_PRESETS.map((size) => (
                  <Pressable key={size} onPress={() => setForm((prev) => ({ ...prev, tankSize: size }))} style={[styles.chip, form.tankSize === size && styles.chipActive]}>
                    <Text style={[styles.chipText, form.tankSize === size && styles.chipTextActive]}>{size} L</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Or type a size"
                keyboardType="numeric"
                placeholderTextColor={Palette.textFaint}
                value={form.tankSize}
                onChangeText={(value) => setForm((prev) => ({ ...prev, tankSize: value.replace(/[^0-9.]/g, '') }))}
              />
              <Text style={styles.helper}>Freshwater only for now.</Text>

              <HoldAction
                onComplete={handleCreateTank}
                disabled={loading}
                tone="primary"
                label={loading ? 'Saving…' : 'Hold to create tank'}
                icon={<IconSymbol name="checkmark" size={18} color={Palette.text} />}
                style={{ marginTop: 22, minHeight: 56 }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Stat({ icon, label, value, warn }: { icon: string; label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.stat}>
      <IconSymbol name={icon as any} size={16} color={warn ? Palette.warning : Palette.mist} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Palette.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 26, height: 26 },
  brand: { color: Palette.text, fontSize: 16, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.4 },
  pager: { gap: 6, alignItems: 'center' },
  pagerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  pagerDotActive: { height: 18, backgroundColor: Palette.text },

  sheet: { marginHorizontal: 14, marginBottom: 10, padding: 18, borderRadius: 28, backgroundColor: 'rgba(16,18,23,0.82)', borderWidth: 1, borderColor: Palette.border },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: 'Montserrat_700Bold' },
  counter: { color: Palette.textFaint, fontSize: 12, fontFamily: 'Montserrat_600SemiBold' },
  tankName: { color: Palette.text, fontSize: 30, fontFamily: 'Montserrat_700Bold' },
  tankMeta: { color: Palette.textMuted, fontSize: 14, marginTop: 2 },

  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, gap: 4, borderWidth: 1, borderColor: Palette.border },
  statValue: { color: Palette.text, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  statLabel: { color: Palette.textFaint, fontSize: 11, fontFamily: 'Montserrat_600SemiBold' },

  tip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: Palette.accentSoft },
  tipText: { flex: 1, color: Palette.text, fontSize: 13, lineHeight: 19 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  addBubble: { width: 60, height: 60, borderRadius: 30, paddingHorizontal: 0 },
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  swipeHintText: { color: Palette.textFaint, fontSize: 12 },

  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { color: Palette.text, fontSize: 28, fontFamily: 'Montserrat_700Bold' },
  emptyText: { color: Palette.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 12 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,7,10,0.6)' },
  modalCard: { maxHeight: '88%', backgroundColor: Palette.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 30, borderWidth: 1, borderColor: Palette.border },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Palette.borderStrong, marginVertical: 10 },
  modalTitle: { color: Palette.text, fontSize: 24, fontFamily: 'Montserrat_700Bold', marginTop: 4 },
  modalSub: { color: Palette.textFaint, fontSize: 13, marginTop: 4, marginBottom: 8 },
  label: { color: Palette.textMuted, fontSize: 13, fontFamily: 'Montserrat_600SemiBold', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  preview: { width: '100%', height: 150, borderRadius: 18, marginBottom: 10 },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, color: Palette.text, fontSize: 15, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border, marginTop: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border },
  chipActive: { backgroundColor: Palette.primarySoft, borderColor: Palette.primaryBorder },
  chipText: { color: Palette.textMuted, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' },
  chipTextActive: { color: Palette.text },
  helper: { color: Palette.textFaint, fontSize: 12, marginTop: 8 },
});
