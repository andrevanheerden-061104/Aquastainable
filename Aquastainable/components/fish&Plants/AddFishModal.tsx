import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import SwipeCheckButton from './SwipeCheckButton';
import CompatibilityResultModal from './CompatibilityResultModal';
import { searchFishCatalogue } from '@/lib/fishCatalog';
import { useFishApi, FishSpecies } from '@/lib/hooks/useFishApi';
import { FishCompatibilityAssessment } from '@/lib/hooks/useFishApi';
import { auth } from '@/firebase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTankApi, TankRecord } from '@/lib/hooks/useTankApi';

type Props = {
  visible: boolean;
  onClose: () => void;
  tankId?: string;
};

export default function AddFishModal({ visible, onClose, tankId: defaultTankId }: Props) {
  const { searchFish, assessFishAddition, addReviewedFish, loading: apiLoading } = useFishApi();
  const { getUserTanks } = useTankApi();
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [selectedFish, setSelectedFish] = useState<FishSpecies | null>(null);
  const [fishSuggestions, setFishSuggestions] = useState<FishSpecies[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedTank, setSelectedTank] = useState<string | null>(defaultTankId || null);
  const [schoolSize, setSchoolSize] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [addingFish, setAddingFish] = useState(false);
  const [tanks, setTanks] = useState<TankRecord[]>([]);
  const [assessment, setAssessment] = useState<FishCompatibilityAssessment | null>(null);
  const [compatibilityVisible, setCompatibilityVisible] = useState(false);
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setTanks([]);
      setSelectedTank(null);
      return;
    }

    getUserTanks(currentUserId)
      .then((userTanks) => {
        const nextTanks = Array.isArray(userTanks) ? userTanks : [];
        setTanks(nextTanks);
        setSelectedTank(defaultTankId && nextTanks.some((tank) => tank.tankId === defaultTankId)
          ? defaultTankId
          : nextTanks[0]?.tankId ?? null);
      })
      .catch(() => setTanks([]));
  }, [currentUserId, defaultTankId, getUserTanks]);

  // Search as the user types:
  // 1. The 50 most common fish are matched instantly on the phone (no network, every letter).
  // 2. 300 ms after typing stops, the server searches online too (common + scientific names).
  //    Older requests are cancelled, so results never jump back to an earlier word.
  useEffect(() => {
    const trimmedQuery = speciesQuery.trim();
    setSearchError('');

    if (!trimmedQuery || (selectedFish && trimmedQuery === (selectedFish.FBname || selectedFish.name).trim())) {
      setFishSuggestions([]);
      setShowSuggestions(false);
      setSearchLoading(false);
      return;
    }

    const local = searchFishCatalogue(trimmedQuery);
    setFishSuggestions(local);
    setShowSuggestions(local.length > 0);

    if (trimmedQuery.length < 2) {
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const remote = await searchFish(trimmedQuery, controller.signal);
        if (controller.signal.aborted) return;
        // Keep the local order; take photos from the server; add online-only fish after.
        const remoteById = new Map(remote.map((fish) => [fish.id, fish]));
        const merged = local.map((fish) => ({ ...fish, ...(remoteById.get(fish.id)?.image ? { image: remoteById.get(fish.id)!.image, imageSourceUrl: remoteById.get(fish.id)!.imageSourceUrl, imageLicense: remoteById.get(fish.id)!.imageLicense } : {}) }));
        const known = new Set(merged.map((fish) => fish.scientificName.toLowerCase()));
        remote.forEach((fish) => {
          const key = (fish.scientificName || '').toLowerCase();
          if (!known.has(key)) { known.add(key); merged.push(fish); }
        });
        setFishSuggestions(merged.slice(0, 12));
        setShowSuggestions(merged.length > 0);
      } catch (error) {
        if (controller.signal.aborted) return;
        // Online search failed: keep the instant results and only show an error if there are none.
        if (!local.length) setSearchError(error instanceof Error ? error.message : 'Fish species search is unavailable.');
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [speciesQuery, searchFish, selectedFish]);

  const handleSelectFish = (fish: FishSpecies) => {
    setSelectedFish(fish);
    setSpeciesQuery(fish.FBname || fish.name);
    setImageLoading(false);
    setShowSuggestions(false);
    setFishSuggestions([]);
  };

  const handleClearSelection = () => {
    setSelectedFish(null);
    setSpeciesQuery('');
    setSchoolSize('');
    setFishSuggestions([]);
    setShowSuggestions(false);
    setImageLoading(false);
    setAssessment(null);
  };

  const getFishPayload = (targetTankId: string) => ({
    userId: currentUserId as string,
    tankId: targetTankId,
    fishId: selectedFish?.id as string,
    schoolSize: schoolSize.trim(),
    name: selectedFish?.name,
    scientificName: selectedFish?.scientificName,
    imageName: selectedFish?.imageName,
    image: selectedFish?.image,
    imageSourceUrl: selectedFish?.imageSourceUrl,
    imageLicense: selectedFish?.imageLicense,
    source: selectedFish?.source,
    assessment: targetTankId === selectedTank && assessment?.canAdd ? assessment : undefined,
  });

  const handleCheckCompatibility = async () => {
    if (!selectedFish || !selectedTank || !currentUserId) {
      Alert.alert('Missing information', 'Please select a fish, tank, and ensure you are logged in.');
      return;
    }

    try {
      setCheckingCompatibility(true);
      const result = await assessFishAddition(getFishPayload(selectedTank));
      if (!schoolSize.trim() && result.optimalSchoolSize) {
        setSchoolSize(result.optimalSchoolSize);
      }
      setAssessment(result);
      setCompatibilityVisible(true);
    } catch (error) {
      Alert.alert('Compatibility check failed', error instanceof Error ? error.message : 'Unable to review this fish.');
    } finally {
      setCheckingCompatibility(false);
    }
  };

  const handleAdd = async (targetTankId = selectedTank) => {
    if (!selectedFish || !targetTankId || !currentUserId) {
      return;
    }

    try {
      setAddingFish(true);
      await addReviewedFish(getFishPayload(targetTankId));

      Alert.alert('Success', `${selectedFish.name} has been added to your tank!`);
      
      // Reset form
      setSelectedFish(null);
      setSpeciesQuery('');
      setSelectedTank(defaultTankId || null);
      setSchoolSize('');
      setFishSuggestions([]);
      setAssessment(null);
      setCompatibilityVisible(false);
      
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add fish.');
    } finally {
      setAddingFish(false);
    }
  };

  const handleAssignSuggestedTank = () => {
    if (assessment?.suggestedTankId) {
      setSelectedTank(assessment.suggestedTankId);
      setCompatibilityVisible(false);
      handleAdd(assessment.suggestedTankId);
    }
  };

  const handleUseOptimalSchoolSize = () => {
    if (assessment?.optimalSchoolSize) {
      setSchoolSize(assessment.optimalSchoolSize);
      setCompatibilityVisible(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.screenBackdrop}>
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Add new fish</Text>
                <Text style={styles.subtitle}>Search a species, and assign to your tank.</Text>
              </View>
              <TouchableOpacity style={styles.closeIconButton} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Fish Image Preview */}
            {selectedFish ? (
              <View style={styles.imageContainer}>
                {selectedFish.image ? (
                  <Image
                    source={{ uri: selectedFish.image }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                  />
                ) : (
                  <View style={styles.imageEmpty}>
                    <Text style={styles.imageEmptyText}>No image available</Text>
                  </View>
                )}
                {imageLoading ? (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.imageLoadingText}>Loading image...</Text>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.clearButton} onPress={handleClearSelection}>
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageEmpty}>
                <Text style={styles.imageEmptyText}>Select a fish to see image</Text>
              </View>
            )}

            {/* Species Search */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Species Name</Text>
              <TextInput
                value={speciesQuery}
                onChangeText={(text) => {
                  setSpeciesQuery(text);
                  if (selectedFish && text.trim() !== selectedFish.name.trim()) {
                    setSelectedFish(null);
                    setImageLoading(false);
                  }
                }}
                placeholder="Search for a fish (e.g., Guppy, Neon Tetra)"
                placeholderTextColor="#6E7684"
                style={styles.input}
              />
              <View style={styles.helperRow}>
                <Text style={styles.helperText}>
                  {searchLoading ? 'Searching more species online…' : 'Search by common or scientific name.'}
                </Text>
                {searchLoading ? <ActivityIndicator size="small" color="#4FB3CC" /> : null}
              </View>

              {/* Fish Suggestions */}
              {showSuggestions && fishSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {fishSuggestions.map((fish) => (
                    <TouchableOpacity
                      key={fish.id}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectFish(fish)}
                    >
                      {fish.image ? (
                        <Image source={{ uri: fish.image }} style={styles.suggestionImage} />
                      ) : (
                        <View style={[styles.suggestionImage, styles.suggestionImageEmpty]}>
                          <IconSymbol name="fish" size={20} color="#4FB3CC" />
                        </View>
                      )}
                      <View style={styles.suggestionContent}>
                        <View style={styles.suggestionTitleRow}>
                          <Text style={styles.suggestionName} numberOfLines={1}>{fish.FBname || fish.name}</Text>
                          {fish.popular ? <Text style={styles.popularBadge}>Popular</Text> : null}
                        </View>
                        {fish.scientificName ? <Text style={styles.suggestionScientific} numberOfLines={1}>{fish.scientificName}</Text> : null}
                        {fish.popular ? (
                          <Text style={styles.suggestionSchool}>
                            {[fish.careLevel && `${fish.careLevel} care`, fish.schoolSize && (fish.schoolSize === "1" ? "keep alone" : `group of ${fish.schoolSize}+`), fish.bestTempC].filter(Boolean).join(' · ')}
                          </Text>
                        ) : fish.schoolSize ? <Text style={styles.suggestionSchool}>School: {fish.schoolSize}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {speciesQuery.trim().length > 0 && !selectedFish && !searchLoading && fishSuggestions.length === 0 && (
                <Text style={styles.noResultsText}>{searchError || 'No fish found for that search.'}</Text>
              )}
            </View>

            {/* Tank Selection */}
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
                    <Text style={[styles.tankLabel, selectedTank === tank.tankId && styles.tankLabelActive]}>
                      {tank.tankName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* School Size */}
            {selectedFish && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>School Size</Text>
                <TextInput
                  value={schoolSize}
                  onChangeText={setSchoolSize}
                  placeholder="Leave blank for an AI recommendation"
                  placeholderTextColor="#6E7684"
                  style={styles.input}
                />
              </View>
            )}

            {/* Add action */}
            {selectedFish && (
              <>
                <View style={styles.divider} />
                <SwipeCheckButton
                  label="Swipe to check compatibility"
                  onSwipe={handleCheckCompatibility}
                  disabled={apiLoading || addingFish || checkingCompatibility}
                />
              </>
            )}
          </ScrollView>
        </View>
        <CompatibilityResultModal
          visible={compatibilityVisible}
          analysis={assessment}
          typeLabel="fish"
          onClose={() => setCompatibilityVisible(false)}
          onSwipeToAdd={() => handleAdd()}
          onAssignSuggested={handleAssignSuggestedTank}
          onUseOptimalSchoolSize={handleUseOptimalSchoolSize}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 20 },
  suggestionImageEmpty: { backgroundColor: 'rgba(46,140,166,0.18)', alignItems: 'center', justifyContent: 'center' },
  suggestionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  popularBadge: { color: '#E0782A', backgroundColor: 'rgba(224,120,42,0.16)', fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
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
    backgroundColor: '#16151A',
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
    right: 0,
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
  helperText: {
    flex: 1,
    color: '#7B869E',
    fontSize: 12,
    lineHeight: 16,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchLoadingText: {
    color: '#AEB7C8',
    fontSize: 12,
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
  analysisTitleWarning: {
    color: '#FF7A7A',
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
  imageContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
  },
  imageEmpty: {
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1B1F28',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  imageEmptyText: {
    color: '#7B869E',
    fontSize: 14,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 15, 23, 0.58)',
    gap: 8,
  },
  imageLoadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  noResultsText: {
    marginTop: 8,
    color: '#8F97A6',
    fontSize: 12,
  },
  suggestionsContainer: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#1B1F28',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    maxHeight: 5 * 44,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  suggestionImage: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: '#14151B',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  suggestionScientific: {
    color: '#8F97A6',
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 1,
  },
  suggestionSchool: {
    color: '#7B869E',
    fontSize: 10,
  },
});
