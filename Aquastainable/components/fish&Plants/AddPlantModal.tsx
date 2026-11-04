import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import SwipeCheckButton from './SwipeCheckButton';
import CompatibilityResultModal from './CompatibilityResultModal';
import { auth } from '../../firebase';
import { useTankApi, TankRecord } from '@/lib/hooks/useTankApi';
import { PlantSpecies, usePlantApi } from '@/lib/hooks/usePlantApi';
import { searchPlantCatalogue } from '@/lib/plantCatalog';
import { IconSymbol } from '@/components/ui/icon-symbol';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Analysis = {
  title: string;
  details: string;
  success: boolean;
  unlock: boolean;
  suggestedPlantName?: string;
};

export default function AddPlantModal({ visible, onClose }: Props) {
  const { searchPlants, assessPlantAddition, addPlantToTank } = usePlantApi();
  const { getUserTanks } = useTankApi();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<PlantSpecies | null>(null);
  const [plantSuggestions, setPlantSuggestions] = useState<PlantSpecies[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTank, setSelectedTank] = useState<string | null>(null);
  const [tanks, setTanks] = useState<TankRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [compatibilityVisible, setCompatibilityVisible] = useState(false);
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (user) => setCurrentUserId(user?.uid ?? null)), []);

  useEffect(() => {
    if (!currentUserId) {
      setTanks([]);
      return;
    }
    getUserTanks(currentUserId)
      .then((userTanks) => {
        const nextTanks = Array.isArray(userTanks) ? userTanks : [];
        setTanks(nextTanks);
        setSelectedTank(nextTanks[0]?.tankId ?? null);
      })
      .catch(() => setTanks([]));
  }, [currentUserId, getUserTanks]);

  // Search as the user types:
  // 1. Common aquarium plants are matched instantly on the phone (every letter, no network).
  // 2. 300 ms after typing stops, the server searches online too. Older requests are cancelled.
  useEffect(() => {
    const trimmedQuery = speciesQuery.trim();
    if (!trimmedQuery || selectedPlant?.name === trimmedQuery) {
      setPlantSuggestions([]);
      setSearchLoading(false);
      return;
    }

    const local = searchPlantCatalogue(trimmedQuery);
    setPlantSuggestions(local);
    if (trimmedQuery.length < 2) {
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const remote = await searchPlants(trimmedQuery, controller.signal);
        if (controller.signal.aborted) return;
        const remoteById = new Map(remote.map((plant) => [plant.id, plant]));
        const merged = local.map((plant) => {
          const match = remoteById.get(plant.id);
          return match?.image && !plant.image ? { ...plant, image: match.image, imageSourceUrl: match.imageSourceUrl, imageLicense: match.imageLicense } : plant;
        });
        const known = new Set(merged.map((plant) => plant.scientificName.toLowerCase()));
        remote.forEach((plant) => {
          const key = (plant.scientificName || '').toLowerCase();
          if (!known.has(key)) { known.add(key); merged.push(plant); }
        });
        setPlantSuggestions(merged.slice(0, 12));
      } catch {
        // Keep the instant results if the online search fails.
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchPlants, selectedPlant, speciesQuery]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos to choose an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSwipeComplete = async () => {
    if (!selectedPlant || !selectedTank || !currentUserId) {
      Alert.alert('Missing information', 'Select a plant and tank before requesting a review.');
      return;
    }

    try {
      setCheckingCompatibility(true);
      const result = await assessPlantAddition({ userId: currentUserId, tankId: selectedTank, plant: selectedPlant });
      setAnalysis({
        title: result.title,
        details: result.explanation,
        success: result.canAdd,
        unlock: result.canAdd,
        suggestedPlantName: result.suggestedPlantName,
      });
      setCompatibilityVisible(true);
    } catch (error) {
      Alert.alert('Review failed', error instanceof Error ? error.message : 'The plant could not be reviewed.');
    } finally {
      setCheckingCompatibility(false);
    }
  };

  const handleSelectSuggestedPlant = async () => {
    if (!analysis?.suggestedPlantName) return;
    const results = await searchPlants(analysis.suggestedPlantName);
    const suggestedPlant = results[0];
    if (!suggestedPlant) {
      Alert.alert('Suggestion unavailable', 'We could not find that plant in the plant database.');
      return;
    }
    handleSelectPlant(suggestedPlant);
    setAnalysis(null);
    setCompatibilityVisible(false);
  };

  const handleSelectPlant = (plant: PlantSpecies) => {
    setSelectedPlant(plant);
    setSpeciesQuery(plant.name);
    setImageUri(plant.image || null);
    setPlantSuggestions([]);
  };

  const handleAdd = async () => {
    if (!analysis?.unlock || !selectedPlant || !selectedTank || !currentUserId) {
      Alert.alert('Missing information', 'Select a plant, tank, and make sure you are signed in.');
      return;
    }

    try {
      await addPlantToTank({
        userId: currentUserId,
        tankId: selectedTank,
        plantId: selectedPlant.id,
        name: selectedPlant.name,
        scientificName: selectedPlant.scientificName,
        image: selectedPlant.image,
        imageSourceUrl: selectedPlant.imageSourceUrl,
        imageLicense: selectedPlant.imageLicense,
        source: selectedPlant.source,
      });
      Alert.alert('Plant added', `${selectedPlant.name} has been added to your tank.`);
      setImageUri(null);
      setSpeciesQuery('');
      setSelectedPlant(null);
      setPlantSuggestions([]);
      setAnalysis(null);
      setCompatibilityVisible(false);
      onClose();
    } catch (error) {
      Alert.alert('Unable to add plant', error instanceof Error ? error.message : 'The plant could not be saved.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.screenBackdrop}>
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Add new plant</Text>
              <Text style={styles.subtitle}>Choose an image, search a plant, and assign a tank.</Text>
            </View>
            <TouchableOpacity style={styles.closeIconButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.8}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <Text style={styles.imageText}>Pick an image</Text>
              )}
            </TouchableOpacity>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Plant</Text>
              <TextInput
                value={speciesQuery}
                onChangeText={setSpeciesQuery}
                placeholder="Search plant species"
                placeholderTextColor="#6E7684"
                style={styles.input}
              />
              <View style={styles.helperRow}>
                <Text style={styles.helperText}>{searchLoading ? 'Searching more plants online…' : 'Search by common or scientific name.'}</Text>
                {searchLoading ? <ActivityIndicator size="small" color="#4FB3CC" /> : null}
              </View>
              {plantSuggestions.length ? (
                <ScrollView style={styles.suggestionsList} nestedScrollEnabled showsVerticalScrollIndicator>
                  {plantSuggestions.map((plant) => (
                    <TouchableOpacity key={plant.id} style={styles.suggestion} onPress={() => handleSelectPlant(plant)} activeOpacity={0.8}>
                      {plant.image ? (
                        <Image source={{ uri: plant.image }} style={styles.suggestionImage} />
                      ) : (
                        <View style={[styles.suggestionImage, styles.suggestionImageEmpty]}>
                          <IconSymbol name="leaf" size={20} color="#4ADE80" />
                        </View>
                      )}
                      <View style={styles.suggestionText}>
                        <View style={styles.suggestionTitleRow}>
                          <Text style={styles.suggestionName} numberOfLines={1}>{plant.name}</Text>
                          {plant.popular ? <Text style={styles.popularBadge}>Popular</Text> : null}
                        </View>
                        <Text style={styles.suggestionScientific} numberOfLines={1}>{plant.scientificName}</Text>
                        {plant.popular ? (
                          <Text style={styles.suggestionMeta} numberOfLines={1}>
                            {[plant.careLevel && `${plant.careLevel} care`, plant.light && `${plant.light} light`, plant.placement].filter(Boolean).join(' · ')}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : speciesQuery.trim() && !selectedPlant && !searchLoading ? (
                <Text style={styles.noResults}>No plants found for that search.</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tank</Text>
              <View style={styles.tankRow}>
                {tanks.map((tank) => (
                  <TouchableOpacity
                    key={tank.tankId}
                    style={[styles.tankOption, selectedTank === tank.tankId && styles.tankOptionActive]}
                    onPress={() => setSelectedTank(tank.tankId)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tankLabel, selectedTank === tank.tankId && styles.tankLabelActive]}>{tank.tankName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Compatibility</Text>
            <SwipeCheckButton label={checkingCompatibility ? 'Reviewing plant...' : 'Swipe to check'} onSwipe={handleSwipeComplete} disabled={checkingCompatibility} />
          </ScrollView>
        </View>
        <CompatibilityResultModal
          visible={compatibilityVisible}
          analysis={analysis}
          typeLabel="plant"
          onClose={() => setCompatibilityVisible(false)}
          onSwipeToAdd={handleAdd}
          onSelectSuggestedPlant={handleSelectSuggestedPlant}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 12, 21, 0.65)',
    justifyContent: 'center',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    marginHorizontal: 18,
    borderRadius: 28,
    backgroundColor: '#10131C',
    maxHeight: '86%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    padding: 22,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  closeIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B1D26',
    alignItems: 'center',
    justifyContent: 'center',
    right: 40,
    top: -10,
  },
  closeIcon: {
    color: '#B3B9C9',
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#8F97A6',
    fontSize: 14,
    marginBottom: 0,
  },
  imagePicker: {
    height: 148,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#15181F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  imageText: {
    color: '#B3B9C9',
    fontSize: 15,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  field: {
    marginBottom: 18,
  },
  fieldLabel: {
    color: '#D0D7E4',
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#14151B',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 20 },
  suggestionImageEmpty: { backgroundColor: 'rgba(74,222,128,0.14)', alignItems: 'center', justifyContent: 'center' },
  suggestionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  popularBadge: { color: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.14)', fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  suggestionMeta: { color: '#6E7684', fontSize: 11, marginTop: 3 },
  noResults: { color: '#8F97A6', fontSize: 13, marginTop: 10 },
  helperText: {
    flex: 1,
    color: '#7B869E',
    fontSize: 12,
    lineHeight: 16,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#1B1D26',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  suggestionsList: {
    maxHeight: 260,
  },
  suggestionImage: {
    width: 46,
    height: 46,
    borderRadius: 10,
    marginRight: 10,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionScientific: {
    color: '#8F97A6',
    fontSize: 12,
    marginTop: 3,
  },
  tankRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tankOption: {
    flex: 1,
    minWidth: '30%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#14151B',
  },
  tankOptionActive: {
    borderColor: '#4FB3CC',
    backgroundColor: 'rgba(46,140,166,0.18)',
  },
  tankLabel: {
    color: '#CED5E3',
    fontSize: 12,
    fontWeight: '600',
  },
  tankLabelActive: {
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 20,
  },
  sectionLabel: {
    color: '#B3B9C9',
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  analysisBox: {
    borderRadius: 22,
    backgroundColor: '#14151B',
    padding: 18,
  },
  analysisTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  analysisTitleSuccess: {
    color: '#7DE0A2',
  },
  analysisTitleWarning: {
    color: '#FFB66A',
  },
  analysisText: {
    color: '#B3B9C9',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#4FB3CC',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  actionButtonDisabled: {
    backgroundColor: '#3A4258',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
