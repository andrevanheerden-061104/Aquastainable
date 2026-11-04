import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';

import Section from '@/components/kit/Section';
import SpecGrid, { SpecItem } from '@/components/kit/SpecGrid';
import SpeciesHero from '@/components/kit/SpeciesHero';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
  const calm = /peace|calm|gentle/i.test(temperament);

  const specs: SpecItem[] = [
    { icon: 'thermometer', label: 'Temperature', value: mainSpecies?.bestTempC || mainSpecies?.tempC ? `${mainSpecies?.bestTempC || mainSpecies?.tempC}°C`.replace('°C°C', '°C') : null },
    { icon: 'drop.fill', label: 'pH range', value: mainSpecies?.phRange || mainSpecies?.pH },
    { icon: 'ruler', label: 'Adult size', value: mainSpecies?.adultLengthCm ? `${mainSpecies.adultLengthCm} cm` : null },
    { icon: 'person.3', label: 'School size', value: mainSpecies?.schoolSize },
    { icon: 'water.waves', label: 'Swims in', value: mainSpecies?.waterSpace },
    { icon: 'hourglass', label: 'Lifespan', value: mainSpecies?.lifespan },
  ];

  const chips = [
    ...(temperament ? [{ label: temperament, tone: (calm ? 'good' : 'warn') as 'good' | 'warn' }] : []),
    ...(mainSpecies?.tankName ? [{ label: mainSpecies.tankName }] : []),
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
          <Section title="Specifications" icon="chart.bar">
            <SpecGrid items={specs} />
          </Section>

          <Section title="Overview" icon="info.circle">
            <Text style={styles.paragraph}>{mainSpecies?.description || 'Care information is being loaded for this species.'}</Text>
            {(mainSpecies?.origin || mainSpecies?.feedType || mainSpecies?.feeding) ? (
              <View style={styles.facts}>
                {mainSpecies?.origin ? <Fact icon="globe" label="Origin" value={mainSpecies.origin} /> : null}
                {(mainSpecies?.feedType || mainSpecies?.feeding) ? <Fact icon="fork.knife" label="Food" value={String(mainSpecies?.feedType || mainSpecies?.feeding)} /> : null}
              </View>
            ) : null}
          </Section>

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

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}><IconSymbol name={icon as any} size={16} color={Palette.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  content: { paddingBottom: 48 },
  paddedContent: { paddingHorizontal: 20 },
  paragraph: { color: Palette.textMuted, fontSize: 15, lineHeight: 23 },
  facts: { gap: 8, marginTop: 14 },
  fact: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border },
  factIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  factLabel: { color: Palette.textFaint, fontSize: 11, fontFamily: 'Montserrat_600SemiBold' },
  factValue: { color: Palette.text, fontSize: 14, lineHeight: 19, marginTop: 1 },
});
