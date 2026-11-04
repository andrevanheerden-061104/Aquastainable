import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';

import AddNewPlantCard from '@/components/fish&Plants/AddNewPlantCard';
import AddPlantModal from '@/components/fish&Plants/AddPlantModal';
import HoldAction from '@/components/gestures/HoldAction';
import PhotoCard from '@/components/kit/PhotoCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';
import { auth } from '@/firebase';
import { SavedPlant, usePlantApi } from '@/lib/hooks/usePlantApi';
import { shortTemperament } from '@/lib/fishText';

type SpeciesCardItem = SavedPlant;

export default function PlantSpeciesScreen() {
  const router = useRouter();
  const { getUserPlants, deletePlant, loading, error } = usePlantApi();
  const [addPlantVisible, setAddPlantVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [species, setSpecies] = useState<SpeciesCardItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (user) => setCurrentUserId(user?.uid ?? null)), []);

  const loadPlants = useCallback(() => {
    if (!currentUserId) {
      setSpecies([]);
      return;
    }
    getUserPlants(currentUserId)
      .then((plants) => setSpecies(Array.isArray(plants) ? plants : []))
      .catch(() => setSpecies([]));
  }, [currentUserId, getUserPlants]);

  useFocusEffect(useCallback(() => {
    loadPlants();
  }, [loadPlants]));

  const handlePress = (item: SpeciesCardItem) => {
    router.push({ pathname: '/(tabs)/plantDetails', params: { speciesId: item.id } });
  };

  const removePlant = async (item: SpeciesCardItem) => {
    if (actionLoading || !currentUserId) return;
    setActionLoading(true);
    try {
      await deletePlant(currentUserId, item.tankId, item.id);
      setSpecies((current) => current.filter((plant) => plant.id !== item.id || plant.tankId !== item.tankId));
    } catch (deleteError) {
      Alert.alert('Plant deletion failed', deleteError instanceof Error ? deleteError.message : 'Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleLight}>Your</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Plants</Text>
          {species.length ? <View style={styles.count}><Text style={styles.countText}>{species.length}</Text></View> : null}
        </View>
        <Text style={styles.subtitle}>Hold a plant to see its care. Hold the bin to remove it.</Text>
      </View>

      <FlatList
        data={[...species, { id: 'add-plant-card' } as SpeciesCardItem]}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          if (item.id === 'add-plant-card') {
            return <AddNewPlantCard onPress={() => setAddPlantVisible(true)} />;
          }

          return (
            <PhotoCard
              image={item.image}
              title={item.name}
              subtitle={item.scientificName || undefined}
              badge={item.growthRate ? `${shortTemperament(item.growthRate)} growth` : undefined}
              meta={[
                { icon: 'mappin', label: item.tankName || 'Unnamed tank' },
                ...(item.placement ? [{ icon: 'square.grid.2x2', label: shortTemperament(item.placement), color: Palette.success }] : []),
              ]}
              onPress={() => handlePress(item)}
              height={200}
              style={styles.card}
              footer={(
                <>
                  <View style={styles.cardMeta}><IconSymbol name="sun.max" size={14} color={Palette.accent} /><Text style={styles.cardMetaText} numberOfLines={1}>{item.light || 'Light –'}</Text></View>
                  <HoldAction onComplete={() => { void removePlant(item); }} tone="danger" speed="confirm" accessibilityLabel={`Hold to delete ${item.name}`} style={styles.cardIcon} contentStyle={{ gap: 0 }}>
                    <IconSymbol name="trash" size={16} color={Palette.dangerText} />
                  </HoldAction>
                </>
              )}
            />
          );
        }}
      />
      {loading ? <ActivityIndicator color="#FFFFFF" style={styles.loading} /> : null}
      {!loading && !error && species.length === 0 ? <Text style={styles.emptyState}>No plants yet. Hold the card above to add your first plant.</Text> : null}
      {error ? <Text style={styles.emptyState}>Unable to load your plants right now.</Text> : null}
      <AddPlantModal visible={addPlantVisible} onClose={() => { setAddPlantVisible(false); loadPlants(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  titleLight: { color: 'rgba(244,246,248,0.8)', fontSize: 26, fontFamily: 'Montserrat_400Regular' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: Palette.text, fontSize: 34, lineHeight: 40, fontFamily: 'Montserrat_700Bold' },
  count: { minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, backgroundColor: Palette.successSoft, alignItems: 'center', justifyContent: 'center' },
  countText: { color: Palette.success, fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  subtitle: { color: Palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 48, gap: 12 },
  row: { gap: 12 },
  card: { flex: 1, maxWidth: '50%' },
  cardMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  cardMetaText: { color: Palette.textMuted, fontSize: 12, flex: 1 },
  cardIcon: { width: 38, height: 38, minHeight: 38, borderRadius: 19, paddingHorizontal: 0 },
  loading: { marginTop: 24 },
  emptyState: { color: Palette.textMuted, textAlign: 'center', paddingHorizontal: 32, marginTop: 8, marginBottom: 24 },
});
