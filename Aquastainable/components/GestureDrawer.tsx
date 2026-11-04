// Side drawer, opened by swiping in from the left edge (no menu button).
// Rebuilt on Gesture Handler + Reanimated: the drag runs on the UI thread with a
// shared value, so the screen no longer re-renders on every frame of the drag.
import { usePathname, useRouter } from 'expo-router';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import HoldAction from '@/components/gestures/HoldAction';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';
import { auth } from '@/firebase';

const EDGE_WIDTH = 22; // invisible strip on the left edge that starts the swipe
const SPRING = { damping: 22, stiffness: 220, mass: 0.9 };

const NAV_ITEMS = [
  { icon: 'house.fill', label: 'Dashboard & Tanks', path: '/(tabs)/home', match: 'home' },
  { icon: 'fish.fill', label: 'Fish Species', path: '/(tabs)/fishSpecies', match: 'fishSpecies' },
  { icon: 'leaf.fill', label: 'Plant Species', path: '/(tabs)/plantSpecies', match: 'plantSpecies' },
  { icon: 'drop.fill', label: 'Water Test', path: '/(tabs)/waterTest', match: 'waterTest' },
  { icon: 'sparkles', label: 'Fish Assistant', path: '/(tabs)/AskAIScreen', match: 'AskAIScreen' },
] as const;

export function GestureDrawer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentPath = usePathname();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(340, width * 0.8);
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  // 0 = closed, 1 = open
  const position = useSharedValue(0);
  const startPosition = useSharedValue(0);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const settle = (toOpen: boolean) => {
    'worklet';
    position.value = withSpring(toOpen ? 1 : 0, SPRING);
    runOnJS(setOpen)(toOpen);
  };

  // One gesture per GestureDetector. Sharing a single gesture between the edge strip
  // and the panel crashed on web ("No handler for tag") when the strip unmounted.
  const makePan = () => Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      startPosition.value = position.value;
    })
    .onUpdate((event) => {
      const next = startPosition.value + event.translationX / drawerWidth;
      position.value = Math.min(1, Math.max(0, next));
    })
    .onEnd((event) => {
      const flungOpen = event.velocityX > 500;
      const flungClosed = event.velocityX < -500;
      settle(flungOpen || (!flungClosed && position.value > 0.4));
    });
  const edgePan = useMemo(makePan, [drawerWidth]); // eslint-disable-line react-hooks/exhaustive-deps
  const panelPan = useMemo(makePan, [drawerWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeDrawer = () => {
    position.value = withTiming(0, { duration: 200 });
    setOpen(false);
  };

  const navigateTo = (path: string) => {
    closeDrawer();
    router.push(path as any);
  };

  const logout = async () => {
    await signOut(auth);
    closeDrawer();
    router.replace('/signin');
  };

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(position.value, [0, 1], [-drawerWidth - 8, 0]) }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(position.value, [0, 1], [0, 0.7]) }));
  const handleStyle = useAnimatedStyle(() => ({ opacity: interpolate(position.value, [0, 0.2], [1, 0]) }));

  const userName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Fishkeeper';
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>{children}</View>

      <Animated.View style={[styles.backdrop, backdropStyle, { pointerEvents: open ? 'auto' : 'none' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} accessibilityLabel="Close menu" />
      </Animated.View>

      {/* Edge strip: only this area starts the swipe, so scrolling and carousels keep working. */}
      <GestureDetector gesture={edgePan}>
        <Animated.View style={[styles.edge, handleStyle, { pointerEvents: open ? 'none' : 'auto' }]} accessibilityLabel="Swipe right to open the menu">
          <View style={styles.edgePill} />
        </Animated.View>
      </GestureDetector>

      <GestureDetector gesture={panelPan}>
        <Animated.View style={[styles.panel, { width: drawerWidth }, panelStyle]}>
          <View style={styles.profile}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initials}>{initials}</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email || 'Account'}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Menu</Text>
          <View style={{ gap: 6 }}>
            {NAV_ITEMS.map((item) => {
              const active = currentPath.includes(item.match);
              return (
                <HoldAction
                  key={item.path}
                  onComplete={() => navigateTo(item.path)}
                  tone={active ? 'primary' : 'ghost'}
                  accessibilityLabel={`Open ${item.label}`}
                  style={styles.navItem}
                  contentStyle={styles.navContent}
                >
                  <IconSymbol size={20} name={item.icon as any} color={active ? Palette.primaryBright : Palette.textMuted} />
                  <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
                </HoldAction>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Text style={styles.tip}>Tip: press and hold anything to use it. Swipe left to close.</Text>
            <HoldAction
              onComplete={logout}
              tone="danger"
              speed="confirm"
              label="Hold to log out"
              icon={<IconSymbol size={18} name="rectangle.portrait.and.arrow.right" color={Palette.dangerText} />}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  mainContent: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#05070A', zIndex: 99 },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: EDGE_WIDTH, zIndex: 98, justifyContent: 'center' },
  edgePill: { width: 4, height: 44, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: Palette.primary, opacity: 0.8 },
  panel: {
    position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 100,
    backgroundColor: Palette.surface, borderRightWidth: 1, borderRightColor: Palette.border,
    paddingTop: 64, paddingHorizontal: 18, paddingBottom: 28, boxShadow: '6px 0px 18px rgba(0, 0, 0, 0.45)' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: Palette.border, marginBottom: 18 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: Palette.primaryBorder },
  avatarFallback: { backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initials: { color: Palette.text, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  userName: { color: Palette.text, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  userEmail: { color: Palette.textMuted, fontSize: 12, marginTop: 2 },
  sectionLabel: { color: Palette.textFaint, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'Montserrat_600SemiBold' },
  navItem: { borderRadius: 16, minHeight: 50, paddingHorizontal: 14 },
  navContent: { justifyContent: 'flex-start', gap: 14 },
  navLabel: { color: Palette.textMuted, fontSize: 15, fontFamily: 'Montserrat_600SemiBold' },
  navLabelActive: { color: Palette.text },
  footer: { marginTop: 'auto', gap: 14 },
  tip: { color: Palette.textFaint, fontSize: 12, lineHeight: 17 },
});
