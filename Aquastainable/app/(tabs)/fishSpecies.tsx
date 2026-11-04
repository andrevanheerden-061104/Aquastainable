import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@/firebase';
import AddNewFishCard from '@/components/fish&Plants/AddNewFishCard';
import AddFishModal from '@/components/fish&Plants/AddFishModal';
import HoldAction from '@/components/gestures/HoldAction';
import PhotoCard from '@/components/kit/PhotoCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';
import { TankFish, useFishApi } from '@/lib/hooks/useFishApi';
import { shortTemperament, temperamentTone } from '@/lib/fishText';

type SpeciesCardItem = TankFish;

export default function FishSpeciesScreen() {
  const router = useRouter();
  const { getUserFish, updateFish, removeFishFromTank, loading, error } = useFishApi();
  const [addFishVisible, setAddFishVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [species, setSpecies] = useState<SpeciesCardItem[]>([]);
  const [editingFish, setEditingFish] = useState<SpeciesCardItem | null>(null);
  const [schoolSizeDraft, setSchoolSizeDraft] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUserId(user?.uid ?? null));
    return unsubscribe;
  }, []);

  const loadFish = useCallback(() => {
    if (!currentUserId) {
      setSpecies([]);
      return;
    }

    getUserFish(currentUserId)
      .then((fish) => setSpecies(Array.isArray(fish) ? fish : []))
      .catch(() => setSpecies([]));
  }, [currentUserId, getUserFish]);

  useFocusEffect(useCallback(() => {
    loadFish();
  }, [loadFish]));

  const handlePress = (item: SpeciesCardItem) => {
    router.push({ pathname: '/(tabs)/fishDetails', params: { speciesId: item.id, tankId: item.tankId } });
  };

  const formatSchoolSize = (value = '') => {
    const compactValue = value.replace(/[^0-9]/g, '');
    if (!compactValue) {
      return '?';
    }
    return compactValue.length > 10 ? `${compactValue.slice(0, 10)}...` : compactValue;
  };

  const openFishEditor = (item: SpeciesCardItem) => {
    setEditingFish(item);
    setSchoolSizeDraft(item.schoolSize || '');
  };

  const saveFishEdit = async () => {
    if (!currentUserId || !editingFish || !schoolSizeDraft.trim()) return;
    setActionLoading(true);
    try {
      await updateFish(currentUserId, editingFish.tankId, editingFish.id, schoolSizeDraft.trim());
      setEditingFish(null);
      loadFish();
    } catch (saveError) {
      Alert.alert('Fish update failed', saveError instanceof Error ? saveError.message : 'Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteFish = async (item: SpeciesCardItem) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await removeFishFromTank(currentUserId || '', item.tankId, item.id);
      setSpecies((current) => current.filter((fish) => fish.id !== item.id || fish.tankId !== item.tankId));
    } catch (deleteError) {
      Alert.alert('Fish deletion failed', deleteError instanceof Error ? deleteError.message : 'Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleLight}>Your</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Fish</Text>
          {species.length ? <View style={styles.count}><Text style={styles.countText}>{species.length}</Text></View> : null}
        </View>
        <Text style={styles.subtitle}>Hold a fish to see its care. Use the buttons underneath to edit or remove it.</Text>
      </View>

      <FlatList
        data={[...species, { id: 'add-fish-card' }]}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          if (!('tankId' in item)) {
            return <AddNewFishCard onPress={() => setAddFishVisible(true)} />;
          }

          return (
            <PhotoCard
              image={item.image}
              title={item.name}
              subtitle={item.scientificName || undefined}
              badge={shortTemperament(item.temperament) || undefined}
              badgeTone={temperamentTone(item.temperament)}
              meta={[
                { icon: 'mappin', label: item.tankName || 'Unnamed tank' },
                { icon: 'person.3', label: `${formatSchoolSize(item.schoolSize)} in school`, color: Palette.accent },
                ...(item.bestTempC || item.tempC ? [{ icon: 'thermometer', label: `${item.bestTempC || item.tempC}°C`.replace('°C°C', '°C'), color: Palette.success }] : []),
              ]}
              onPress={() => handlePress(item)}
              height={200}
              style={styles.card}
              footer={(
                <>
                  <HoldAction onComplete={() => openFishEditor(item)} tone="primary" label="Edit" icon={<IconSymbol name="pencil" size={14} color={Palette.text} />} style={styles.cardAction} textStyle={styles.cardActionText} />
                  <HoldAction onComplete={() => { void deleteFish(item); }} tone="danger" speed="confirm" accessibilityLabel={`Hold to delete ${item.name}`} style={styles.cardIcon} contentStyle={{ gap: 0 }}>
                    <IconSymbol name="trash" size={16} color={Palette.dangerText} />
                  </HoldAction>
                </>
              )}
            />
          );
        }}
      />
      {loading ? <ActivityIndicator color="#FFFFFF" style={styles.loading} /> : null}
      {!loading && !error && species.length === 0 ? <Text style={styles.emptyState}>No fish yet. Hold the card above to add your first fish.</Text> : null}
      {error ? <Text style={styles.emptyState}>Unable to load your fish right now.</Text> : null}
      <AddFishModal visible={addFishVisible} onClose={() => { setAddFishVisible(false); loadFish(); }} />
      <Modal visible={Boolean(editingFish)} transparent animationType="slide" onRequestClose={() => setEditingFish(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditingFish(null)} accessibilityLabel="Close" />
          <View style={styles.editModal}>
            <View style={styles.grabber} />
            <Text style={styles.editEyebrow}>Edit school</Text>
            <Text style={styles.editTitle}>{editingFish?.name || 'Fish'}</Text>
            <Text style={styles.editSubtitle}>How many of this fish live in {editingFish?.tankName || 'this tank'}?</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => setSchoolSizeDraft((v) => String(Math.max(1, (parseInt(v, 10) || 1) - 1)))} style={styles.stepBtn} accessibilityLabel="One fewer"><Text style={styles.stepText}>−</Text></Pressable>
              <TextInput value={schoolSizeDraft} onChangeText={(v) => setSchoolSizeDraft(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" style={styles.stepInput} />
              <Pressable onPress={() => setSchoolSizeDraft((v) => String((parseInt(v, 10) || 0) + 1))} style={styles.stepBtn} accessibilityLabel="One more"><Text style={styles.stepText}>+</Text></Pressable>
            </View>
            <HoldAction onComplete={() => { void saveFishEdit(); }} disabled={actionLoading} tone="primary" label={actionLoading ? 'Saving…' : 'Hold to save'} icon={<IconSymbol name="checkmark" size={18} color={Palette.text} />} style={{ minHeight: 54 }} />
            <Text style={styles.cancelHint}>Tap outside to cancel</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  titleLight: { color: 'rgba(244,246,248,0.8)', fontSize: 26, fontFamily: 'Montserrat_400Regular' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: Palette.text, fontSize: 34, lineHeight: 40, fontFamily: 'Montserrat_700Bold' },
  count: { minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  countText: { color: Palette.primaryBright, fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  subtitle: { color: Palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 48, gap: 12 },
  row: { gap: 12 },
  card: { flex: 1, maxWidth: '50%' },
  cardAction: { flex: 1, minHeight: 38, paddingHorizontal: 10 },
  cardActionText: { fontSize: 13 },
  cardIcon: { width: 38, height: 38, minHeight: 38, borderRadius: 19, paddingHorizontal: 0 },
  loading: { marginTop: 24 },
  emptyState: { color: Palette.textMuted, textAlign: 'center', paddingHorizontal: 32, marginTop: 8, marginBottom: 24 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(5,7,10,0.7)', justifyContent: 'flex-end' },
  editModal: { backgroundColor: Palette.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingTop: 0, paddingBottom: 34, gap: 4, borderWidth: 1, borderColor: Palette.border },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Palette.borderStrong, marginVertical: 10 },
  editEyebrow: { color: Palette.primaryBright, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: 'Montserrat_700Bold' },
  editTitle: { color: Palette.text, fontSize: 24, fontFamily: 'Montserrat_700Bold' },
  editSubtitle: { color: Palette.textMuted, fontSize: 14, marginBottom: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  stepBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: Palette.text, fontSize: 24, fontFamily: 'Montserrat_600SemiBold' },
  stepInput: { flex: 1, height: 54, borderRadius: 18, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border, color: Palette.text, fontSize: 22, textAlign: 'center', fontFamily: 'Montserrat_700Bold' },
  cancelHint: { color: Palette.textFaint, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
