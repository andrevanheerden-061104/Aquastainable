// Pick which tanks and fish the Fish Assistant should think about.
// Two swipeable strips of small photo cards: tanks (photo, name, size, fish count)
// and species grouped by the tank they live in (the same fish in two tanks is two
// separate entries). Tap a card to include it; nothing selected = use everything.
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, qualityTone } from '@/constants/palette';

export const tankKey = (tank: any) => String(tank?.tankId || tank?.id || '');
// One entry per species *per tank*: the saved record id is unique per tank.
export const speciesKey = (item: any, kind: 'fish' | 'plant') => `${kind}:${item?.tankId || ''}:${item?.id || item?.fishId || item?.plantId || ''}`;

export type ContextSelection = { tankIds: string[]; speciesIds: string[] };

type Props = {
  tanks: any[];
  fish: any[];
  plants: any[];
  selection: ContextSelection;
  onSelectionChange: (selection: ContextSelection) => void;
  accent?: string;
};

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

export default function ContextPicker({ tanks, fish, plants, selection, onSelectionChange, accent = Palette.primaryBright }: Props) {
  const visibleTanks = selection.tankIds.length ? tanks.filter((tank) => selection.tankIds.includes(tankKey(tank))) : tanks;
  const groups = visibleTanks
    .map((tank) => ({
      tank,
      species: [
        ...fish.filter((item) => String(item.tankId) === tankKey(tank)).map((item) => ({ item, kind: 'fish' as const })),
        ...plants.filter((item) => String(item.tankId) === tankKey(tank)).map((item) => ({ item, kind: 'plant' as const })),
      ],
    }))
    .filter((group) => group.species.length);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>Tanks</Text>
        <Text style={styles.hint}>{selection.tankIds.length ? `${selection.tankIds.length} selected` : 'All tanks'}</Text>
      </View>
      {tanks.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {tanks.map((tank) => {
            const id = tankKey(tank);
            const active = selection.tankIds.includes(id);
            const count = fish.filter((item) => String(item.tankId) === id).length;
            const quality = qualityTone(tank.waterQuality);
            return (
              <Pressable
                key={id}
                onPress={() => onSelectionChange({ ...selection, tankIds: toggle(selection.tankIds, id) })}
                style={[styles.tankCard, active && { borderColor: accent, backgroundColor: `${accent}1F` }]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`Use tank ${tank.tankName || 'Unnamed tank'}`}
              >
                <View style={styles.tankThumb}>
                  {tank.tankImg ? <Image source={{ uri: tank.tankImg }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <IconSymbol name="cube.box" size={22} color={Palette.textFaint} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{tank.tankName || 'Unnamed tank'}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>{[tank.tankSize ? `${tank.tankSize} L` : '', `${count} fish`].filter(Boolean).join(' · ')}</Text>
                  {quality.level !== 'unknown' ? (
                    <View style={styles.qualityRow}>
                      <View style={[styles.dot, { backgroundColor: quality.color }]} />
                      <Text style={[styles.quality, { color: quality.color }]}>{quality.label}</Text>
                    </View>
                  ) : null}
                </View>
                {active ? <Check color={accent} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : <Text style={styles.empty}>No tanks yet.</Text>}

      <View style={[styles.head, { marginTop: 18 }]}>
        <Text style={styles.label}>Fish & plants</Text>
        <Text style={styles.hint}>{selection.speciesIds.length ? `${selection.speciesIds.length} selected` : 'All species'}</Text>
      </View>
      {groups.length ? groups.map(({ tank, species }) => (
        <Animated.View key={tankKey(tank)} entering={FadeIn.duration(200)} style={styles.group}>
          <View style={styles.groupHead}>
            <IconSymbol name="mappin" size={12} color={Palette.textFaint} />
            <Text style={styles.groupTitle}>{tank.tankName || 'Unnamed tank'}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {species.map(({ item, kind }) => {
              const id = speciesKey(item, kind);
              const active = selection.speciesIds.includes(id);
              const count = String(item.schoolSize || '').replace(/[^0-9]/g, '');
              return (
                <Pressable
                  key={id}
                  onPress={() => onSelectionChange({ ...selection, speciesIds: toggle(selection.speciesIds, id) })}
                  style={[styles.speciesCard, active && { borderColor: accent, backgroundColor: `${accent}1F` }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`Use ${item.name || 'species'} in ${tank.tankName || 'this tank'}`}
                >
                  <View style={styles.speciesThumb}>
                    {item.image ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <IconSymbol name={kind === 'plant' ? 'leaf' : 'fish.fill'} size={18} color={Palette.textFaint} />}
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name || item.FBname || 'Species'}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>{kind === 'plant' ? 'Plant' : count ? `${count} fish` : 'Fish'}</Text>
                  </View>
                  {active ? <Check color={accent} small /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      )) : <Text style={styles.empty}>No fish or plants in {selection.tankIds.length ? 'the selected tanks' : 'your tanks'} yet.</Text>}
    </View>
  );
}

function Check({ color, small }: { color: string; small?: boolean }) {
  const size = small ? 18 : 22;
  return (
    <View style={[styles.check, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <IconSymbol name="checkmark" size={small ? 12 : 14} color={Palette.background} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { color: Palette.text, fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  hint: { color: Palette.textFaint, fontSize: 12 },
  strip: { gap: 10, paddingRight: 20 },
  tankCard: {
    width: 250, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20,
    backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border,
  },
  tankThumb: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden', backgroundColor: Palette.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: Palette.text, fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  cardMeta: { color: Palette.textMuted, fontSize: 12, marginTop: 2 },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  quality: { fontSize: 11, fontFamily: 'Montserrat_600SemiBold' },
  group: { marginBottom: 12 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  groupTitle: { color: Palette.textFaint, fontSize: 11, letterSpacing: 0.8, fontFamily: 'Montserrat_600SemiBold', textTransform: 'uppercase' },
  speciesCard: {
    minWidth: 150, maxWidth: 210, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingRight: 12, borderRadius: 999,
    backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border,
  },
  speciesThumb: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: Palette.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  check: { alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  empty: { color: Palette.textFaint, fontSize: 13 },
});
