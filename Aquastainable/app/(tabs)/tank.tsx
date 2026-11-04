// app/(tabs)/tank.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Image, Alert, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';

import HoldAction from '@/components/gestures/HoldAction';
import PhotoCard from '@/components/kit/PhotoCard';
import Section from '@/components/kit/Section';
import SpecGrid, { SpecItem } from '@/components/kit/SpecGrid';
import SpeciesHero from '@/components/kit/SpeciesHero';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, qualityTone } from '@/constants/palette';
import Colors from '@/lib/colors';
import { Species, TankDetail } from '@/lib/data/tankDetails';
import { useTankApi } from '@/lib/hooks/useTankApi';
import { useFishApi } from '@/lib/hooks/useFishApi';
import { usePlantApi } from '@/lib/hooks/usePlantApi';
import useWaterTestApi, { WaterTestRecord } from '@/lib/hooks/useWaterTestApi';
import { auth } from '@/firebase';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 16;
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;
const TILE_GAP = 16;
const TILE_WIDTH = (SCREEN_WIDTH - 40 - TILE_GAP) / 2;
const TILE_HEIGHT = 250;
const SPECIES_CARD = Math.min(220, SCREEN_WIDTH * 0.52);

// Uses the shared HoldAction gesture (save = quick hold, delete = longer confirm hold).
function HoldActionButton({ style, onHold, disabled, fillColor, text }: { style: object; onHold: () => void; disabled: boolean; fillColor: string; text: string }) {
  const danger = /delete/i.test(text) || fillColor === '#B83A45';
  return (
    <HoldAction
      onComplete={onHold}
      disabled={disabled}
      tone={danger ? 'danger' : 'primary'}
      speed={danger ? 'confirm' : 'quick'}
      label={text}
      style={[style, { backgroundColor: undefined }]}
    />
  );
}

function mapApiSpecies(item: any, type: Species['type']): Species {
  return {
    id: type === 'fish' ? item.fishId || item.id : item.plantId || item.id,
    type,
    image: item.image || item.imageUrl || '',
    name: item.name || item.FBname || 'Unnamed species',
    speciesName: item.scientificName || item.speciesName || 'Unknown species',
    origin: item.origin || 'Unknown',
    lifespan: item.lifespan || 'Unknown',
    preferredTempC: item.preferredTempC || item.bestTempC || item.tempC || 'Unknown',
    feeding: item.feeding || item.feedType || 'Unknown',
    schoolSize: item.schoolSize || 'Unknown',
    summary: item.summary || item.description || 'No species description available.',
  };
}

// ConditionTile and SpeciesCard moved to components/tank/

export default function TankInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTankById, getTankOverview, updateTank, deleteTank } = useTankApi();
  const { getTankFish } = useFishApi();
  const { getUserPlants } = usePlantApi();
  const { getTankWaterTests } = useWaterTestApi();
  
  const [tank, setTank] = useState<TankDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm] = useState({ tankName: '', tankSize: '', tankImg: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const speciesListRef = useRef<FlatList<Species>>(null);

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
    });
    return () => unsubscribe();
  }, []);

  // Fetch tank data from the API.
  const loadTank = useCallback(async () => {
      setLoading(true);
      
      if (!id) {
        setLoading(false);
        return;
      }

      if (currentUserId) {
        try {
          const [apiTank, tankFish, userPlants, waterTests] = await Promise.all([
            getTankById(currentUserId, id),
            getTankFish(id).catch(() => []),
            getUserPlants(currentUserId).catch(() => []),
            getTankWaterTests(id).catch(() => []),
          ]);
          if (apiTank) {
              const latestTest = [...waterTests].sort((left, right) => new Date(right.testedAt).getTime() - new Date(left.testedAt).getTime())[0] as WaterTestRecord | undefined;
              const species = [
                ...tankFish.map((fish) => mapApiSpecies(fish, 'fish')),
                ...userPlants.filter((plant) => plant.tankId === id).map((plant) => mapApiSpecies(plant, 'plant')),
              ];
              let overview = apiTank.overview || '';
              try {
                const overviewResult = await getTankOverview(currentUserId, id);
                overview = overviewResult.overview || overview;
              } catch (overviewError) {
                console.error('Error generating tank overview:', overviewError);
              }

            // Convert API tank format to TankDetail format
            const convertedTank: TankDetail = {
              tankId: apiTank.tankId || apiTank.id,
              tankName: apiTank.tankName,
              tankSize: apiTank.tankSize,
              tankImg: apiTank.tankImg,
                overviewSummary: overview,
              conditions: {
                preferredTempC: latestTest?.readings?.temperatureC || apiTank.preferredTempC || apiTank.temperatureC || '',
                waterQuality: (latestTest?.waterQuality || apiTank.waterQuality || 'Good') as TankDetail['conditions']['waterQuality'],
                lastTestedDaysAgo: latestTest ? Math.max(0, Math.floor((Date.now() - new Date(latestTest.testedAt).getTime()) / 86400000)) : apiTank.lastTestedDaysAgo || 0,
                ph: latestTest?.readings?.ph || apiTank.ph || '',
                ammoniaPpm: (latestTest?.readings?.ammoniaPpm ?? apiTank.ammoniaPpm?.toString()) || '',
                nitritePpm: (latestTest?.readings?.nitritePpm ?? apiTank.nitritePpm?.toString()) || '',
              },
              species,
              careTips: [],
            };
            setTank(convertedTank);
          }
        } catch (error) {
          console.error('Error fetching tank:', error);
        }
      }
      
      setLoading(false);
  }, [currentUserId, getTankById, getTankFish, getTankOverview, getTankWaterTests, getUserPlants, id]);

  useFocusEffect(useCallback(() => {
    loadTank();
  }, [loadTank]));

  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set((tank?.species ?? []).filter((s) => s.favorite).map((s) => s.id))
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.missingContainer}>
        <Text style={styles.missingText}>Loading tank...</Text>
      </SafeAreaView>
    );
  }

  if (!tank) {
    return (
      <SafeAreaView style={styles.missingContainer}>
        <Text style={styles.missingText}>We couldn't find that tank.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLinkButton}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const toggleFavorite = (speciesId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(speciesId)) next.delete(speciesId);
      else next.add(speciesId);
      return next;
    });
  };

  const goToIndex = (index: number) => {
    setActiveIndex(index);
    speciesListRef.current?.scrollToOffset({ offset: index * CARD_STRIDE, animated: true });
  };

  const onSpeciesScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CARD_STRIDE);
    setActiveIndex(Math.max(0, Math.min(tank.species.length - 1, index)));
  };

  const activeSpecies = tank.species[activeIndex] || tank.species[0];
  const tankImageSource = tank.tankImg ? { uri: tank.tankImg } : null;

  const openEditModal = () => {
    setEditForm({ tankName: tank.tankName, tankSize: String(tank.tankSize || ''), tankImg: tank.tankImg || '' });
    setEditVisible(true);
  };

  const pickTankImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setEditForm((current) => ({ ...current, tankImg: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri }));
    }
  };

  const saveTankEdits = async () => {
    if (!currentUserId || !tank) return;
    const tankName = editForm.tankName.trim();
    const tankSize = Number(editForm.tankSize);
    if (!tankName || !Number.isFinite(tankSize) || tankSize <= 0) {
      Alert.alert('Missing details', 'Enter a tank name and a size greater than zero.');
      return;
    }

    setSavingEdit(true);
    try {
      await updateTank(currentUserId, tank.tankId, { tankName, tankSize, tankImg: editForm.tankImg });
      await loadTank();
      setEditVisible(false);
    } catch (error) {
      Alert.alert('Tank update failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const removeTank = async () => {
    if (!currentUserId || !tank || savingEdit) return;
    setSavingEdit(true);
    try {
      await deleteTank(currentUserId, tank.tankId);
      setEditVisible(false);
      router.back();
    } catch (error) {
      Alert.alert('Tank deletion failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  // --- display helpers -------------------------------------------------------
  const c = tank.conditions;
  const quality = qualityTone(c.waterQuality);
  const num = (v: unknown) => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : null; };
  const ammonia = num(c.ammoniaPpm);
  const nitrite = num(c.nitritePpm);
  const phValue = num(c.ph);
  const temp = num(c.preferredTempC);
  const hasTest = c.ph !== '' || c.ammoniaPpm !== '' || c.nitritePpm !== '';
  const days = hasTest ? c.lastTestedDaysAgo : null;
  const toxic = (ammonia ?? 0) > 0 || (nitrite ?? 0) > 0;
  const fishCount = tank.species.filter((item) => item.type === 'fish').length;
  const plantCount = tank.species.filter((item) => item.type === 'plant').length;

  const careItems: SpecItem[] = [
    { icon: 'thermometer', label: 'Temperature', value: temp !== null ? `${temp}°C` : null, tone: temp !== null && (temp < 18 || temp > 30) ? 'warn' : 'default' },
    { icon: 'drop.fill', label: 'pH level', value: phValue ?? null, tone: phValue !== null && (phValue < 6 || phValue > 8.2) ? 'warn' : 'default' },
    { icon: 'ruler', label: 'Tank size', value: tank.tankSize ? `${tank.tankSize} L` : null },
    { icon: 'arrow.triangle.2.circlepath', label: 'Water change', value: toxic ? 'Today' : 'Weekly', tone: toxic ? 'bad' : 'default' },
    { icon: 'chart.bar', label: 'Bioload', value: toxic ? 'High' : fishCount > 3 ? 'Medium' : 'Low', tone: toxic ? 'bad' : 'good' },
    { icon: 'calendar', label: 'Next test', value: days === null ? 'Now' : days >= 7 ? 'Due' : `${7 - days} day${7 - days === 1 ? "" : "s"}`, tone: days === null || days >= 7 ? 'warn' : 'default' },
  ];

  const readingTone = (value: number | null, warnAbove: number): SpecItem['tone'] => (value === null ? 'default' : value > warnAbove ? 'bad' : 'good');
  const testItems: SpecItem[] = [
    { icon: 'drop.fill', label: 'pH', value: phValue ?? null },
    { icon: 'thermometer', label: 'Temp', value: temp !== null ? `${temp}°C` : null },
    { icon: 'testtube.2', label: 'Ammonia', value: ammonia !== null ? `${ammonia} ppm` : null, tone: readingTone(ammonia, 0) },
    { icon: 'testtube.2', label: 'Nitrite', value: nitrite !== null ? `${nitrite} ppm` : null, tone: readingTone(nitrite, 0) },
  ];

  const openSpecies = (item: Species) => {
    const dest = item.type === 'plant' ? '/(tabs)/plantDetails' : '/(tabs)/fishDetails';
    router.push({ pathname: dest, params: { speciesId: item.id } });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SpeciesHero
          image={tankImageSource}
          title={tank.tankName}
          subtitle={`Freshwater · ${tank.tankSize || 0} L · ${fishCount} fish · ${plantCount} plants`}
          chips={[{ label: quality.label, tone: quality.level === 'excellent' ? 'good' : quality.level === 'attention' ? 'bad' : quality.level === 'fair' ? 'warn' : 'default' }]}
          height={420}
          right={(
            <HoldAction
              onComplete={openEditModal}
              label="Edit"
              accessibilityLabel="Hold to edit tank"
              icon={<IconSymbol name="pencil" size={16} color={Palette.text} />}
              style={styles.editPill}
            />
          )}
        />

        <View style={styles.body}>
          {/* AI overview: 1-2 sentences */}
          <View style={[styles.overview, toxic && styles.overviewBad]}>
            <View style={styles.overviewHead}>
              <IconSymbol name="sparkles" size={16} color={toxic ? Palette.danger : Palette.accent} />
              <Text style={styles.overviewLabel}>Quick overview</Text>
            </View>
            <Text style={styles.overviewText}>
              {tank.overviewSummary?.trim() || 'Add fish, plants or a water test and you will get a quick overview of your tank here.'}
            </Text>
          </View>

          <Section title="Aquarium care" icon="water.waves">
            <SpecGrid items={careItems} />
          </Section>

          <Section title="Latest water test" icon="testtube.2" hint={hasTest ? (days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`) : 'No test yet'}>
            <Pressable onPress={() => router.push({ pathname: '/(tabs)/waterTestDetails', params: { tankId: tank.tankId } })} accessibilityLabel="Open water test details">
              <View style={styles.testCard}>
                {hasTest ? (
                  <>
                    <View style={[styles.qualityBar, { backgroundColor: quality.soft }]}>
                      <View style={[styles.qualityDot, { backgroundColor: quality.color }]} />
                      <Text style={[styles.qualityText, { color: quality.color }]}>{quality.label}</Text>
                      <Text style={styles.qualityMore}>See full report ›</Text>
                    </View>
                    <SpecGrid items={testItems} columns={2} />
                  </>
                ) : (
                  <View style={styles.testEmpty}>
                    <IconSymbol name="testtube.2" size={28} color={Palette.primaryBright} />
                    <Text style={styles.testEmptyTitle}>No water test yet</Text>
                    <Text style={styles.testEmptyText}>Tap here to log your first test. It only takes a minute.</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </Section>

          <Section title="Fish & plants" icon="fish.fill" hint={tank.species.length ? `${tank.species.length} in this tank` : undefined}>
            {tank.species.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={SPECIES_CARD + 12} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
                {tank.species.map((item) => (
                  <PhotoCard
                    key={item.id}
                    image={item.image}
                    title={item.name}
                    subtitle={item.type === 'plant' ? item.speciesName : item.schoolSize && item.schoolSize !== 'Unknown' ? `School of ${item.schoolSize}` : item.speciesName}
                    badge={item.type === 'plant' ? 'Plant' : 'Fish'}
                    onPress={() => openSpecies(item)}
                    style={{ width: SPECIES_CARD }}
                    height={230}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No fish or plants in this tank yet. Add them from the Fish or Plant pages.</Text>
            )}
          </Section>
        </View>
      </ScrollView>
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.editBackdrop}>
          <View style={styles.editCard}>
            <View style={styles.editHeader}>
              <View>
                <Text style={styles.editEyebrow}>TANK DETAILS</Text>
                <Text style={styles.editTitle}>Edit tank</Text>
              </View>
              <TouchableOpacity style={styles.editClose} onPress={() => setEditVisible(false)} accessibilityLabel="Close edit tank">
                <Text style={styles.editCloseText}>X</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.editImageBox} onPress={pickTankImage} activeOpacity={0.8}>
              {editForm.tankImg ? <Image source={{ uri: editForm.tankImg }} style={styles.editImage} resizeMode="cover" /> : <Text style={styles.editImageText}>Add tank image</Text>}
              <View style={styles.editImageBadge}><Text style={styles.editImageBadgeText}>Change</Text></View>
            </TouchableOpacity>

            <Text style={styles.editLabel}>Tank name</Text>
            <TextInput value={editForm.tankName} onChangeText={(value) => setEditForm((current) => ({ ...current, tankName: value }))} placeholder="Tank name" placeholderTextColor="#6E7684" style={styles.editInput} />
            <Text style={styles.editLabel}>Tank size (litres)</Text>
            <TextInput value={editForm.tankSize} onChangeText={(value) => setEditForm((current) => ({ ...current, tankSize: value }))} placeholder="20" placeholderTextColor="#6E7684" keyboardType="numeric" style={styles.editInput} />

            <HoldActionButton style={styles.saveEditButton} onHold={saveTankEdits} disabled={savingEdit} fillColor="#2E8CA6" text={savingEdit ? 'Saving...' : 'Hold to save changes'} />
            <HoldActionButton style={styles.deleteTankButton} onHold={removeTank} disabled={savingEdit} fillColor="#B83A45" text="Hold to delete tank" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const HERO_HEIGHT = 260;
const THUMB_SIZE = 58;

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 48 },
  editPill: { minHeight: 42, paddingHorizontal: 16, backgroundColor: 'rgba(12,14,18,0.55)', borderColor: 'rgba(255,255,255,0.14)' },
  overview: { marginTop: 18, padding: 16, borderRadius: 22, backgroundColor: Palette.accentSoft, borderWidth: 1, borderColor: 'rgba(224,120,42,0.25)', gap: 8 },
  overviewBad: { backgroundColor: Palette.dangerSoft, borderColor: Palette.dangerBorder },
  overviewHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overviewLabel: { color: Palette.textMuted, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Montserrat_700Bold' },
  overviewText: { color: Palette.text, fontSize: 15, lineHeight: 23 },
  testCard: { backgroundColor: Palette.surface, borderRadius: 24, padding: 10, gap: 10, borderWidth: 1, borderColor: Palette.border },
  qualityBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  qualityDot: { width: 8, height: 8, borderRadius: 4 },
  qualityText: { fontSize: 14, fontFamily: 'Montserrat_700Bold', flex: 1 },
  qualityMore: { color: Palette.textMuted, fontSize: 12, fontFamily: 'Montserrat_600SemiBold' },
  testEmpty: { alignItems: 'center', paddingVertical: 22, gap: 6 },
  testEmptyTitle: { color: Palette.text, fontSize: 16, fontFamily: 'Montserrat_700Bold', marginTop: 4 },
  testEmptyText: { color: Palette.textMuted, fontSize: 13, textAlign: 'center' },
  emptyText: { color: Palette.textMuted, fontSize: 14, lineHeight: 20 },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tankName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  
  tankSubtitle: {
    color: '#6E6E73',
    fontSize: 15,
    marginTop: 4,
    marginBottom: 20,
  },

  // Hero Section
  hero: {
    height: HERO_HEIGHT,
    marginBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'visible',
  },
  heroSideColumn: {
    width: 90,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  heroThumbStack: {
    marginTop: 8,
  },
  heroSmallThumb: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
    elevation: 4,
    boxShadow: '0px 14px 18px rgba(0, 0, 0, 0.18)' },
  heroSmallThumbSpacing: {
    marginTop: 16,
  },
  heroSmallThumbSelected: {
    borderWidth: 2,
    borderColor: '#4FB3CC',
  },
  heroSmallThumbImage: {
    width: '100%',
    height: '100%',
  },
  heroPreviewContainer: {
    width: HERO_HEIGHT * 1.1,
    height: HERO_HEIGHT * 1.1,
    borderRadius: (HERO_HEIGHT * 1.1) / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -40,
  },
  heroPreviewBackground: {
    ...StyleSheet.absoluteFill,
  },
  heroPreviewBackgroundImage: {
    ...StyleSheet.absoluteFill,
    opacity: 0.62,
  },
  heroPreviewOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17, 17, 24, 0.45)',
  },
  heroCircleContainer: {
    width: '100%',
    height: '100%',
    borderRadius: (HERO_HEIGHT * 1.1) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    overflow: 'hidden',
    boxShadow: '0px 26px 42px rgba(26, 38, 56, 0.28)' },
  heroCircleGlow: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    borderRadius: 999,
    backgroundColor: 'rgba(91, 140, 255, 0.18)',
    transform: [{ scale: 1.12 }],
  },
  heroCircleImage: {
    width: '100%',
    height: '100%',
    borderRadius: (HERO_HEIGHT * 1.1) / 2,
  },

  // Section Headers & Text
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3A3A3C',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },

  editBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(7,12,21,0.78)',
  },
  editCard: {
    maxHeight: '90%',
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#16151A',
    borderWidth: 1,
    borderColor: 'rgba(168,196,203,0.18)',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  editEyebrow: {
    color: '#6C98A0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  editTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  editClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  editCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  editImageBox: {
    height: 150,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    backgroundColor: '#1B1D26',
  },
  editImage: {
    width: '100%',
    height: '100%',
  },
  editImageText: {
    color: '#A8C4CB',
    fontSize: 14,
    fontWeight: '600',
  },
  editImageBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  editImageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  editLabel: {
    color: '#A8C4CB',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 7,
  },
  editInput: {
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: '#1B1D26',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  saveEditButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 15,
    backgroundColor: '#1B5667',
  },
  deleteTankButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 15,
    backgroundColor: '#6F2028',
  },
  saveEditText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Action Button removed

  // Missing screen fallback
  missingContainer: {
    flex: 1,
    backgroundColor: '#121214',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
  },
  backLinkButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backLinkText: {
    color: '#8E8E93',
    fontSize: 14,
  },
});
