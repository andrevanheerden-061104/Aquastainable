import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';

import Section from '@/components/kit/Section';
import SpecGrid, { SpecItem } from '@/components/kit/SpecGrid';
import SpeciesHero from '@/components/kit/SpeciesHero';
import FactList, { Fact } from '@/components/kit/FactList';
import ProseCard from '@/components/kit/ProseCard';
import { present, shortTemperament, temperamentTone } from '@/lib/fishText';
import { Palette } from '@/constants/palette';
import FishLogGrid from '@/components/fish&Plants/FishLogGrid';
import FishSicknessAssistant, { FishSicknessPrefill } from '@/components/fish&Plants/FishSicknessAssistant';
import { auth } from '@/firebase';
import { TankFish, useFishApi } from '@/lib/hooks/useFishApi';

export default function FishDetailsScreen() {
  const router = useRouter();
  const { speciesId } = useLocalSearchParams<{ speciesId?: string }>();
  const { getUserFish, enrichFish } = useFishApi();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [fish, setFish] = useState<TankFish[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUserId(user?.uid ?? null));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setFish([]);
      return;
    }

    getUserFish(currentUserId)
      .then(async (userFish) => {
        const nextFish = Array.isArray(userFish) ? userFish : [];
        setFish(nextFish);
        const selectedFish = nextFish.find((item) => item.id === speciesId || item.fishId === speciesId);
        if (selectedFish && (!selectedFish.description || !selectedFish.bestTempC || !selectedFish.phRange)) {
          try {
            await enrichFish(currentUserId, selectedFish.fishId || speciesId || '');
            const refreshedFish = await getUserFish(currentUserId);
            setFish(Array.isArray(refreshedFish) ? refreshedFish : nextFish);
          } catch {
            setFish(nextFish);
          }
        }
      })
      .catch(() => setFish([]));
  }, [currentUserId, speciesId, getUserFish, enrichFish]);

  const mainSpecies = fish.find((item) => item.id === speciesId || item.fishId === speciesId);
  const temperament = String(mainSpecies?.temperament || '').trim();
  const shortTemp = shortTemperament(temperament);
  const schoolCount = present(mainSpecies?.schoolSize);

  const specs: SpecItem[] = [
    { icon: 'thermometer', label: 'Temperature', value: present(mainSpecies?.bestTempC || mainSpecies?.tempC) ? `${mainSpecies?.bestTempC || mainSpecies?.tempC}°C`.replace('°C°C', '°C') : null },
    { icon: 'drop.fill', label: 'pH range', value: present(mainSpecies?.phRange || mainSpecies?.pH) },
    { icon: 'ruler', label: 'Adult size', value: mainSpecies?.adultLengthCm ? `${mainSpecies.adultLengthCm} cm` : null },
    { icon: 'person.3', label: 'In your tank', value: schoolCount ? `${schoolCount} fish` : null, tone: 'accent' },
    { icon: 'water.waves', label: 'Swims in', value: present(mainSpecies?.swimLevel) },
    { icon: 'hourglass', label: 'Lifespan', value: present(mainSpecies?.lifespan) },
  ].filter((item) => item.value) as SpecItem[];

  const chips = [
    ...(shortTemp ? [{ label: shortTemp, tone: temperamentTone(temperament) }] : []),
    ...(mainSpecies?.tankName ? [{ label: mainSpecies.tankName }] : []),
  ];

  const rawAdded: any = mainSpecies?.addedAt;
  const addedOn = rawAdded ? new Date(typeof rawAdded === 'object' ? (rawAdded._seconds ?? rawAdded.seconds ?? 0) * 1000 : rawAdded) : null;
  const facts: Fact[] = [
    { icon: 'globe', label: 'Origin', value: mainSpecies?.origin },
    { icon: 'fork.knife', label: 'Food', value: mainSpecies?.feedType || mainSpecies?.feeding },
    { icon: 'face.smiling', label: 'Temperament', value: temperament, color: Palette.primaryBright },
    { icon: 'ruler', label: 'Tank size', value: mainSpecies?.waterSpace, color: Palette.primaryBright },
    { icon: 'person.3', label: 'Group size', value: mainSpecies?.minimumGroupSize ? (mainSpecies.minimumGroupSize === 1 ? 'Keep alone' : `${mainSpecies.minimumGroupSize} or more`) : null, color: Palette.primaryBright },
    { icon: 'heart', label: 'Care level', value: mainSpecies?.careLevel, color: Palette.success },
    { icon: 'mappin', label: 'Lives in', value: mainSpecies?.tankName, color: Palette.success },
    { icon: 'calendar', label: 'Added', value: addedOn && !Number.isNaN(addedOn.getTime()) ? addedOn.toLocaleDateString() : null, color: Palette.success },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SpeciesHero
          image={mainSpecies?.image ? { uri: mainSpecies.image } : null}
          title={mainSpecies?.name ?? 'Fish'}
          subtitle={mainSpecies?.scientificName}
          chips={chips}
        />

        <View style={styles.paddedContent}>
          {specs.length ? (
            <Section title="Specifications" icon="chart.bar">
              <SpecGrid items={specs} />
            </Section>
          ) : null}

          <Section title="Overview" icon="info.circle">
            <ProseCard
              eyebrow={`About the ${mainSpecies?.name || 'fish'}`}
              text={mainSpecies?.description || 'Care information is being loaded for this species.'}
            />
          </Section>

          <Section title="Quick facts" icon="list.bullet">
            <FactList items={facts} />
          </Section>

          <View style={styles.sickness}>
          <FishSicknessAssistant
            speciesName={mainSpecies?.name ?? 'fish'}
            onSendToAI={(prefill: FishSicknessPrefill) => {
              router.push({
                pathname: '/(tabs)/AskAIScreen',
                params: {
                  theme: 'crimson',
                  prefillText: prefill.text,
                  prefillSpeciesName: prefill.speciesName,
                  prefillMediaUris: JSON.stringify(prefill.mediaUris),
                },
              });
            }}
          />
          </View>

          <Section title="Your fish" icon="heart" subtitle="Give each fish in your school a name and a photo.">
            <FishLogGrid
              userId={currentUserId || ''}
              tankId={mainSpecies?.tankId || ''}
              fishDocId={mainSpecies?.id || ''}
              onParentSchoolSizeChange={(schoolSize) => {
                setFish((currentFish) => currentFish.map((item) => (
                  item.id === mainSpecies?.id ? { ...item, schoolSize } : item
                )));
              }}
            />
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  content: { paddingBottom: 48 },
  paddedContent: { paddingHorizontal: 20 },
  sickness: { marginTop: 28 },
});
