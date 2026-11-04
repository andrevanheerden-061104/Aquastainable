import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';

import Section from '@/components/kit/Section';
import SpecGrid, { SpecItem } from '@/components/kit/SpecGrid';
import SpeciesHero from '@/components/kit/SpeciesHero';
import { Palette } from '@/constants/palette';
import { auth } from '@/firebase';
import { SavedPlant, usePlantApi } from '@/lib/hooks/usePlantApi';

export default function PlantDetailsScreen() {
  const { speciesId } = useLocalSearchParams<{ speciesId?: string }>();
  const { getUserPlants } = usePlantApi();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [plants, setPlants] = useState<SavedPlant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (user) => setCurrentUserId(user?.uid ?? null)), []);

  useEffect(() => {
    if (!currentUserId) {
      setPlants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getUserPlants(currentUserId)
      .then((savedPlants) => setPlants(Array.isArray(savedPlants) ? savedPlants : []))
      .catch(() => setPlants([]))
      .finally(() => setLoading(false));
  }, [currentUserId, getUserPlants]);

  const mainPlant = plants.find((plant) => plant.id === speciesId || plant.plantId === speciesId);
  const specs: SpecItem[] = [
    { icon: 'sun.max', label: 'Light', value: mainPlant?.light, tone: 'accent' },
    { icon: 'leaf', label: 'Growth', value: mainPlant?.growthRate, tone: 'good' },
    { icon: 'mappin', label: 'Placement', value: mainPlant?.placement },
    { icon: 'thermometer', label: 'Temperature', value: mainPlant?.bestTempC ? `${mainPlant.bestTempC}°C`.replace('°C°C', '°C') : null },
    { icon: 'drop.fill', label: 'pH range', value: mainPlant?.phRange },
    { icon: 'water.waves', label: 'Tank', value: mainPlant?.tankName },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SpeciesHero
          image={mainPlant?.image ? { uri: mainPlant.image } : null}
          title={mainPlant?.name ?? (loading ? 'Loading…' : 'Plant')}
          subtitle={mainPlant?.scientificName}
          chips={mainPlant?.growthRate ? [{ label: `${mainPlant.growthRate} growth`, tone: 'good' }] : []}
        />
        <View style={styles.paddedContent}>
          {loading ? <ActivityIndicator color={Palette.primaryBright} style={{ marginTop: 24 }} /> : null}
          {mainPlant ? (
            <>
              <Section title="Plant care" icon="leaf">
                <SpecGrid items={specs} />
              </Section>
              <Section title="Overview" icon="info.circle">
                <Text style={styles.paragraph}>{mainPlant.description || 'No description yet for this plant.'}</Text>
              </Section>
            </>
          ) : !loading ? <Text style={[styles.paragraph, { marginTop: 24 }]}>We could not find this plant.</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  content: { paddingBottom: 48 },
  paddedContent: { paddingHorizontal: 20 },
  paragraph: { color: Palette.textMuted, fontSize: 15, lineHeight: 23 },
});
