import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';

import Section from '@/components/kit/Section';
import SpecGrid, { SpecItem } from '@/components/kit/SpecGrid';
import SpeciesHero from '@/components/kit/SpeciesHero';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, qualityTone } from '@/constants/palette';
import AddWaterTestModal from '../../components/waterTest/AddWaterTestModal';
import HoldToOpenButton from '../../components/waterTest/HoldToOpenButton';
import { auth } from '@/firebase';
import { useTankApi } from '@/lib/hooks/useTankApi';
import useWaterTestApi, { WaterTestRecord } from '@/lib/hooks/useWaterTestApi';

export default function WaterTestDetailsScreen() {
  const { tankId } = useLocalSearchParams<{ tankId?: string }>();
  const { getTankById } = useTankApi();
  const { getTankWaterTests } = useWaterTestApi();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tank, setTank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addTestVisible, setAddTestVisible] = useState(false);
  const [latestTest, setLatestTest] = useState<WaterTestRecord | null>(null);
  const [waterTests, setWaterTests] = useState<WaterTestRecord[]>([]);

  const loadWaterTestData = useCallback(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUserId(user?.uid ?? null));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!tankId) {
      setLoading(false);
      return;
    }

    if (!currentUserId) {
      return;
    }

    setLoading(true);
    Promise.all([getTankById(currentUserId, tankId), getTankWaterTests(tankId).catch(() => [])])
      .then(([apiTank, tests]) => {
        const sortedTests = [...tests].sort((left, right) => new Date(right.testedAt).getTime() - new Date(left.testedAt).getTime());
        const newestTest = sortedTests[0] || null;
        setWaterTests(sortedTests);
        setLatestTest(newestTest);
        setTank({
          tankId: apiTank.tankId || apiTank.id,
          tankName: apiTank.tankName || 'Unnamed tank',
          tankImg: apiTank.tankImg || '',
          conditions: {
            preferredTempC: apiTank.preferredTempC || apiTank.temperatureC || '~',
            waterQuality: newestTest?.waterQuality || apiTank.waterQuality || '~',
            lastTestedDaysAgo: newestTest ? Math.floor((Date.now() - new Date(newestTest.testedAt).getTime()) / 86400000) : apiTank.lastTestedDaysAgo ?? '~',
            ph: newestTest?.readings?.ph || apiTank.ph || '~',
            ammoniaPpm: newestTest?.readings?.ammoniaPpm ?? apiTank.ammoniaPpm ?? '~',
            nitritePpm: newestTest?.readings?.nitritePpm ?? apiTank.nitritePpm ?? '~',
          },
        });
      })
      .catch(() => setTank(null))
      .finally(() => setLoading(false));
  }, [currentUserId, getTankById, getTankWaterTests, tankId]);

  useFocusEffect(useCallback(() => {
    loadWaterTestData();
  }, [loadWaterTestData]));

  if (loading) {
    return <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={Palette.primaryBright} /></SafeAreaView>;
  }

  if (!tank) {
    return <SafeAreaView style={styles.container}><Text style={styles.emptyText}>Tank data unavailable.</Text></SafeAreaView>;
  }

  const latestTestAge = latestTest ? Math.max(0, Math.floor((Date.now() - new Date(latestTest.testedAt).getTime()) / 86400000)) : null;
  const conditions = latestTest ? {
    ...tank.conditions,
    waterQuality: latestTest.waterQuality || tank.conditions.waterQuality,
    lastTestedDaysAgo: latestTestAge,
    ph: latestTest.readings?.ph || '~',
    temperatureC: latestTest.readings?.temperatureC || '~',
    preferredTempC: latestTest.readings?.temperatureC || '~',
    ammoniaPpm: latestTest.readings?.ammoniaPpm ?? '~',
    nitritePpm: latestTest.readings?.nitritePpm ?? '~',
  } : tank.conditions;
  const hasTestDate = typeof conditions.lastTestedDaysAgo === 'number';
  const nextTestDue = hasTestDate ? (conditions.lastTestedDaysAgo >= 7 ? 'Due now' : `${7 - conditions.lastTestedDaysAgo} day${7 - conditions.lastTestedDaysAgo === 1 ? "" : "s"}`) : '~';
  const testDate = hasTestDate ? `${conditions.lastTestedDaysAgo} days ago` : '~';
  const hasTestData = conditions.ph !== '~' || conditions.ammoniaPpm !== '~' || conditions.nitritePpm !== '~';
  const history = waterTests.map((test, index) => ({
    title: index === 0 ? 'Latest test' : `Test ${index + 1}`,
    date: new Date(test.testedAt).toLocaleDateString(),
    summary: test.summary || `Water quality: ${test.waterQuality || 'Unknown'}.`,
    data: [
      { label: 'pH', value: test.readings?.ph || '~' },
      { label: 'Ammonia', value: test.readings?.ammoniaPpm ?? '~' },
      { label: 'Nitrite', value: test.readings?.nitritePpm ?? '~' },
      { label: 'Water quality', value: test.waterQuality || '~' },
    ],
  }));

  const quality = qualityTone(conditions.waterQuality === '~' ? '' : conditions.waterQuality);
  const chipTone = quality.level === 'excellent' ? 'good' : quality.level === 'attention' ? 'bad' : quality.level === 'fair' ? 'warn' : 'default';
  const num = (value: unknown) => { const n = parseFloat(String(value)); return Number.isFinite(n) ? n : null; };
  const toxinTone = (value: unknown): SpecItem['tone'] => { const n = num(value); return n === null ? 'default' : n === 0 ? 'good' : n <= 0.25 ? 'warn' : 'bad'; };
  const phTone = (value: unknown): SpecItem['tone'] => { const n = num(value); return n === null ? 'default' : n >= 6.5 && n <= 8 ? 'good' : 'warn'; };
  const withUnit = (value: unknown, unit: string) => (value === '~' || value === '' || value === undefined || value === null ? '—' : `${value}${unit}`);
  const readings: SpecItem[] = [
    { icon: 'water.waves', label: 'pH', value: withUnit(conditions.ph, ''), tone: phTone(conditions.ph) },
    { icon: 'thermometer', label: 'Temperature', value: withUnit(conditions.preferredTempC, '°C') },
    { icon: 'testtube.2', label: 'Ammonia', value: withUnit(conditions.ammoniaPpm, ' ppm'), tone: toxinTone(conditions.ammoniaPpm) },
    { icon: 'testtube.2', label: 'Nitrite', value: withUnit(conditions.nitritePpm, ' ppm'), tone: toxinTone(conditions.nitritePpm) },
    { icon: 'calendar', label: 'Tested', value: hasTestDate ? (conditions.lastTestedDaysAgo === 0 ? 'Today' : testDate) : '—' },
    { icon: 'hourglass', label: 'Next test', value: nextTestDue === '~' ? '—' : nextTestDue, tone: nextTestDue === 'Due now' ? 'warn' : 'default' },
  ];
  const summary = latestTest?.summary || (quality.level === 'unknown'
    ? 'No water test yet. Hold the button below to add your first one.'
    : quality.level === 'excellent'
    ? 'The water is balanced and healthy. Keep up your routine.'
    : 'The tank may need attention soon. Watch ammonia and nitrite and do an early water change.');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SpeciesHero
          image={tank.tankImg ? { uri: tank.tankImg } : null}
          title={`Water test`}
          subtitle={`${tank.tankName} · ${hasTestDate ? `last tested ${conditions.lastTestedDaysAgo === 0 ? 'today' : testDate}` : 'not tested yet'}`}
          chips={[{ label: quality.label, tone: chipTone }]}
          height={320}
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          <View style={[styles.summaryCard, { borderColor: quality.level === 'unknown' ? Palette.border : quality.color + '55', backgroundColor: quality.soft }]}>
            <View style={styles.summaryHead}>
              <IconSymbol name="sparkles" size={16} color={quality.color} />
              <Text style={[styles.summaryEyebrow, { color: quality.color }]}>AI SUMMARY</Text>
            </View>
            <Text style={styles.summaryText}>{summary}</Text>
            {latestTest?.nextWaterChange ? (
              <View style={styles.nextRow}>
                <IconSymbol name="arrow.triangle.2.circlepath" size={14} color={Palette.textMuted} />
                <Text style={styles.nextChange}>Next water change: {latestTest.nextWaterChange}</Text>
              </View>
            ) : null}
          </View>

          <HoldToOpenButton onHold={() => setAddTestVisible(true)} />

          <Section title="Readings" icon="chart.bar" hint={hasTestData ? 'Latest test' : undefined}>
            <SpecGrid items={readings} columns={2} />
          </Section>

          <Section title="Past tests" icon="calendar" hint={history.length ? `${history.length} saved` : undefined}>
            {history.length > 0 ? (
              <View style={styles.historyList}>
                {waterTests.map((test, index) => {
                  const tone = qualityTone(test.waterQuality);
                  return (
                    <View key={test.id || `${test.testedAt}-${index}`} style={styles.historyRow}>
                      <View style={[styles.historyDot, { backgroundColor: tone.color }]} />
                      <View style={styles.historyMain}>
                        <View style={styles.historyTop}>
                          <Text style={styles.historyTitle}>{index === 0 ? 'Latest test' : new Date(test.testedAt).toLocaleDateString()}</Text>
                          <Text style={[styles.historyBadge, { color: tone.color, backgroundColor: tone.soft }]}>{tone.label}</Text>
                        </View>
                        <Text style={styles.historyMeta}>
                          pH {test.readings?.ph || '—'} · NH₃ {test.readings?.ammoniaPpm ?? '—'} · NO₂ {test.readings?.nitritePpm ?? '—'}
                        </Text>
                        {test.summary ? <Text style={styles.historySummary} numberOfLines={2}>{test.summary}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : <Text style={styles.emptyInline}>No past water tests yet.</Text>}
          </Section>
        </View>
      </ScrollView>
      {currentUserId ? <AddWaterTestModal visible={addTestVisible} tankId={tank.tankId} userId={currentUserId} onClose={() => setAddTestVisible(false)} onSaved={() => { setAddTestVisible(false); getTankWaterTests(tank.tankId).then((tests) => { const sortedTests = [...tests].sort((left, right) => new Date(right.testedAt).getTime() - new Date(left.testedAt).getTime()); setWaterTests(sortedTests); setLatestTest(sortedTests[0] || null); }).catch(() => undefined); }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  emptyText: { color: Palette.textMuted, fontSize: 14, textAlign: 'center', marginTop: 80 },
  content: { paddingBottom: 48 },
  body: { paddingHorizontal: 20, gap: 20, marginTop: 4 },
  summaryCard: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 10 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryEyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  summaryText: { color: Palette.text, fontSize: 15, lineHeight: 23 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: Palette.border },
  nextChange: { color: Palette.textMuted, fontSize: 13 },
  historyList: { gap: 10 },
  historyRow: { flexDirection: 'row', gap: 12, backgroundColor: Palette.surface, borderRadius: 18, borderWidth: 1, borderColor: Palette.border, padding: 14 },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  historyMain: { flex: 1, gap: 4 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  historyTitle: { color: Palette.text, fontSize: 15, fontWeight: '700' },
  historyBadge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  historyMeta: { color: Palette.textMuted, fontSize: 13 },
  historySummary: { color: Palette.textFaint, fontSize: 13, lineHeight: 19 },
  emptyInline: { color: Palette.textFaint, fontSize: 14 },
});
