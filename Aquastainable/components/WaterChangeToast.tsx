// Water-change reminder banner shown once after sign-in.
// Before: a full-screen Modal that blocked every touch on the home screen for 15 s.
// Now: one compact banner at the top. The rest of the screen stays usable.
// Swipe it up or sideways to dismiss. It also hides itself after 8 s.
import { onAuthStateChanged } from 'firebase/auth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInUp, FadeOutUp, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTankApi } from '@/lib/hooks/useTankApi';
import useWaterTestApi, { WaterTestRecord } from '@/lib/hooks/useWaterTestApi';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';
import { auth } from '@/firebase';

type Reminder = { id: string; tankName: string; reminder: string; urgent: boolean };

const isUrgent = (text: string) => /today|now|overdue|asap/i.test(text);

export default function WaterChangeToast() {
  const insets = useSafeAreaInsets();
  const { getUserTanks } = useTankApi();
  const { getTankWaterTests } = useWaterTestApi();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const shownUserRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setReminders([]);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { shownUserRef.current = null; return; }
      if (shownUserRef.current === user.uid) return;
      shownUserRef.current = user.uid;
      try {
        const tanks = await getUserTanks(user.uid);
        const next = await Promise.all((Array.isArray(tanks) ? tanks : []).map(async (tank) => {
          const id = tank.id || tank.tankId;
          const tests = await getTankWaterTests(id).catch(() => [] as WaterTestRecord[]);
          const latest = [...tests].sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime())[0];
          const reminder = latest?.nextWaterChange || '';
          return { id: String(id), tankName: tank.tankName || 'Unnamed tank', reminder, urgent: isUrgent(reminder) };
        }));
        const withTiming_ = next.filter((item) => item.reminder).sort((a, b) => Number(b.urgent) - Number(a.urgent));
        if (!withTiming_.length) return;
        x.value = 0; y.value = 0;
        setReminders(withTiming_);
        timer.current = setTimeout(dismiss, 8000);
      } catch {
        // A reminder should never block the user from using the app.
      }
    });
    return () => { unsubscribe(); if (timer.current) clearTimeout(timer.current); };
  }, [dismiss, getTankWaterTests, getUserTanks, x, y]);

  const swipe = Gesture.Pan()
    .onUpdate((event) => {
      x.value = event.translationX;
      y.value = Math.min(0, event.translationY);
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 90 || event.translationY < -40) {
        x.value = withTiming(event.translationX > 0 ? 500 : event.translationX < -90 ? -500 : 0, { duration: 180 });
        y.value = withTiming(event.translationY < -40 ? -200 : 0, { duration: 180 }, () => runOnJS(dismiss)());
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));

  if (!reminders.length) return null;
  const urgentCount = reminders.filter((item) => item.urgent).length;

  return (
    <View style={[styles.layer, { top: insets.top + 8 }, { pointerEvents: 'box-none' }]}>
      <GestureDetector gesture={swipe}>
        <Animated.View entering={FadeInUp.duration(260)} exiting={FadeOutUp.duration(180)}>
        <Animated.View style={[styles.card, urgentCount > 0 ? styles.cardUrgent : null, style]}>
          <View style={styles.headRow}>
            <View style={[styles.icon, urgentCount ? styles.iconUrgent : null]}>
              <IconSymbol name="drop.fill" size={16} color={urgentCount ? Palette.warning : Palette.primaryBright} />
            </View>
            <Text style={styles.title}>
              {urgentCount ? `Water change due today` : 'Upcoming water changes'}
            </Text>
          </View>
          {reminders.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.tank} numberOfLines={1}>{item.tankName}</Text>
              <Text style={[styles.when, item.urgent && styles.whenUrgent]} numberOfLines={1}>{item.reminder}</Text>
            </View>
          ))}
          <View style={styles.grabber} />
        </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 12, right: 12, zIndex: 50 },
  card: {
    backgroundColor: 'rgba(23,26,33,0.96)', borderRadius: 20, borderWidth: 1, borderColor: Palette.borderStrong,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.4)' },
  cardUrgent: { borderColor: 'rgba(251,191,36,0.4)' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  icon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconUrgent: { backgroundColor: Palette.warningSoft },
  title: { color: Palette.text, fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 },
  tank: { color: Palette.textMuted, fontSize: 13, flexShrink: 1 },
  when: { color: Palette.text, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' },
  whenUrgent: { color: Palette.warning },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 8 },
});
