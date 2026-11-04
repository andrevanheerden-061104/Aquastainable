// Fish Assistant: a chat that only answers questions about fish (health, feeding,
// tank mates, and the water/tank as it affects fish). Answers come back in a short,
// fixed format that AnswerCard renders: headline -> one-line why -> 2-3 steps.
import { useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import ContextPicker, { speciesKey } from '@/components/AiAssistant/ContextPicker';
import AnswerCard from '@/components/AiAssistant/AnswerCard';
import InputBar from '@/components/AiAssistant/InputBar';
import HoldAction from '@/components/gestures/HoldAction';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';
import { auth } from '@/firebase';

import useAiApi, { AiChat, AiChatMessage } from '@/lib/hooks/useAiApi';
import { useFishApi } from '@/lib/hooks/useFishApi';
import { usePlantApi } from '@/lib/hooks/usePlantApi';
import { useTankApi } from '@/lib/hooks/useTankApi';

type TopicId = 'sick' | 'feeding' | 'tankmates' | 'water';

const TOPICS: { id: TopicId; label: string; icon: string; mode: string; color: string; questions: string[] }[] = [
  {
    id: 'sick', label: 'Sick fish', icon: 'exclamationmark.triangle', mode: 'fish sickness and problems', color: '#F05D5E',
    questions: ['My fish has white spots on its fins. What should I do?', 'Why is my fish staying at the bottom?', 'My fish has torn or ragged fins. Is it sick?'],
  },
  {
    id: 'feeding', label: 'Feeding', icon: 'fork.knife', mode: 'feeding', color: '#E0782A',
    questions: ['How much and how often should I feed my fish?', 'What is the best food for my fish?', 'Can I leave my fish without food for a weekend?'],
  },
  {
    id: 'tankmates', label: 'Tank mates', icon: 'person.3', mode: 'tank mates and stocking', color: '#A78BFA',
    questions: ['Which fish can safely live with my fish?', 'Is my tank overstocked?', 'Why are my fish chasing each other?'],
  },
  {
    id: 'water', label: 'Water & fish', icon: 'drop.fill', mode: 'water quality for fish', color: '#4FB3CC',
    questions: ['Is my water safe for my fish right now?', 'How often should I change the water?', 'Why is my tank water cloudy?'],
  },
];

// Older links (e.g. from the sickness helper) pass a colour "theme"; map it to a topic.
const THEME_TO_TOPIC: Record<string, TopicId> = { crimson: 'sick', emerald: 'water', midnight: 'tankmates' };

const FAILED = 'I could not reach the Fish Assistant. Check your connection and hold Retry.';

export default function AskAIScreen() {
  const params = useLocalSearchParams<{
    theme?: string; prefillText?: string; prefillMediaUri?: string; prefillMediaType?: 'image' | 'video'; prefillMediaUris?: string; prefillSpeciesName?: string;
  }>();

  const [topic, setTopic] = useState<TopicId | null>(params.theme ? THEME_TO_TOPIC[params.theme] ?? null : null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tanks, setTanks] = useState<any[]>([]);
  const [fish, setFish] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [selection, setSelection] = useState({ tankIds: [] as string[], speciesIds: [] as string[] });
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [chats, setChats] = useState<AiChat[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  const prefillMediaUris = (() => {
    try { return params.prefillMediaUris ? JSON.parse(params.prefillMediaUris) as string[] : []; } catch { return []; }
  })();
  const [pendingMediaUris, setPendingMediaUris] = useState<string[]>(() => Array.from(new Set([
    ...prefillMediaUris, ...(params.prefillMediaUri ? [params.prefillMediaUri] : []),
  ])));
  const prefillSpeciesName = params.prefillSpeciesName ?? '';

  const { getUserTanks } = useTankApi();
  const { getUserFish } = useFishApi();
  const { getUserPlants } = usePlantApi();
  const { askAssistant, getChats, getChat, deleteChat, loading } = useAiApi();

  useEffect(() => onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null)), []);
  useEffect(() => {
    if (!userId) return;
    Promise.all([getUserTanks(userId), getUserFish(userId), getUserPlants(userId)])
      .then(([nextTanks, nextFish, nextPlants]) => {
        setTanks(Array.isArray(nextTanks) ? nextTanks : []);
        setFish(Array.isArray(nextFish) ? nextFish : []);
        setPlants(Array.isArray(nextPlants) ? nextPlants : []);
      }).catch(() => undefined);
  }, [userId, getUserTanks, getUserFish, getUserPlants]);

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60); }, [messages]);

  const openHistory = async () => {
    if (!userId) return;
    setChats(await getChats(userId).catch(() => []));
    setHistoryVisible(true);
  };

  const openChat = async (selected: AiChat) => {
    if (!userId) return;
    const full = await getChat(userId, selected.id);
    setChatId(full.id);
    setMessages(full.messages || []);
    setHistoryVisible(false);
  };

  const removeChat = async (selected: AiChat) => {
    if (!userId) return;
    await deleteChat(userId, selected.id).catch(() => undefined);
    setChats((current) => current.filter((chat) => chat.id !== selected.id));
    if (chatId === selected.id) newChat();
  };

  const newChat = () => {
    setChatId(undefined);
    setMessages([]);
    setTopic(null);
    setHistoryVisible(false);
  };

  const getContext = () => ({
    tanks: selection.tankIds.length ? tanks.filter((tank) => selection.tankIds.includes(tank.tankId || tank.id)) : tanks,
    fish: selection.speciesIds.length
      ? fish.filter((item) => selection.speciesIds.includes(speciesKey(item, 'fish')))
      : selection.tankIds.length ? fish.filter((item) => selection.tankIds.includes(String(item.tankId))) : fish,
    plants: selection.speciesIds.length
      ? plants.filter((item) => selection.speciesIds.includes(speciesKey(item, 'plant')))
      : selection.tankIds.length ? plants.filter((item) => selection.tankIds.includes(String(item.tankId))) : plants,
    selectedTankIds: selection.tankIds,
    selectedSpeciesIds: selection.speciesIds,
    mode: TOPICS.find((item) => item.id === topic)?.mode || 'general fish question',
  });

  const sendMessage = async (message: string, retryIndex?: number, mediaUri?: string) => {
    if (!userId || loading) return;
    const retried = retryIndex === undefined ? undefined : messages[retryIndex];
    const context = retried?.context ?? { ...getContext(), ...(prefillSpeciesName ? { sicknessSpecies: prefillSpeciesName } : {}) };
    const historyMessages = retryIndex === undefined ? messages : messages.slice(0, retryIndex);
    const images = retryIndex === undefined ? Array.from(new Set([...pendingMediaUris, ...(mediaUri ? [mediaUri] : [])])) : retried?.imageUrls;
    if (retryIndex === undefined) setPendingMediaUris([]);
    setDraft(undefined);
    const optimistic: AiChatMessage = { ...retried, question: message, answer: '', context, imageUrls: images };
    setMessages((current) => retryIndex === undefined ? [...current, optimistic] : current.map((item, index) => index === retryIndex ? optimistic : item));
    try {
      const result = await askAssistant({
        userId, chatId, message, context, images,
        history: historyMessages.flatMap((item) => [{ role: 'user' as const, content: item.question }, ...(item.answer ? [{ role: 'assistant' as const, content: item.answer }] : [])]),
      });
      setChatId(result.chatId);
      setMessages((current) => retryIndex === undefined
        ? [...current.slice(0, -1), { question: message, answer: result.answer, context, imageUrls: result.imageUrls }]
        : current.map((item, index) => index === retryIndex ? { ...item, answer: result.answer, context } : item));
    } catch {
      setMessages((current) => retryIndex === undefined
        ? [...current.slice(0, -1), { question: message, answer: FAILED, context }]
        : current.map((item, index) => index === retryIndex ? { ...item, answer: FAILED, context } : item));
    }
  };

  const activeTopic = TOPICS.find((item) => item.id === topic) || null;
  const fishNames = Array.from(new Set(fish.map((item) => item.name || item.FBname).filter(Boolean))).slice(0, 3);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Image source={require('../../assets/logo/Aque-logo.png')} style={styles.headerLogo} resizeMode="contain" />
              <View>
                <Text style={styles.title}>Fish Assistant</Text>
                <Text style={styles.subtitle}>Simple answers about your fish</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <HoldAction onComplete={openHistory} tone="ghost" accessibilityLabel="Open past chats" style={styles.iconBubble} contentStyle={{ gap: 0 }}>
                <IconSymbol name="clock" size={20} color={Palette.textMuted} />
              </HoldAction>
              {messages.length ? (
                <HoldAction onComplete={newChat} tone="ghost" accessibilityLabel="Start a new chat" style={styles.iconBubble} contentStyle={{ gap: 0 }}>
                  <IconSymbol name="square.and.pencil" size={20} color={Palette.textMuted} />
                </HoldAction>
              ) : null}
            </View>
          </View>

          <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {messages.length ? messages.map((item, index) => (
              <Animated.View key={`${index}-${item.question}`} entering={FadeInDown.duration(260)} style={styles.turn}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{item.question}</Text>
                  {item.imageUrls?.length ? (
                    <View style={styles.userImages}>
                      {item.imageUrls.slice(0, 3).map((uri) => <Image key={uri} source={{ uri }} style={styles.userImage} />)}
                    </View>
                  ) : null}
                </View>
                <View style={styles.assistantRow}>
                  <View style={styles.avatar}><Image source={require('../../assets/logo/Aque-logo.png')} style={{ width: 20, height: 20 }} resizeMode="contain" /></View>
                  <View style={styles.flex}>
                    {item.answer ? (
                      <Animated.View entering={FadeIn.duration(220)}>
                        <AnswerCard answer={item.answer} tone={item.answer === FAILED ? 'muted' : 'default'} />
                        <HoldAction
                          onComplete={() => sendMessage(item.question, index)}
                          disabled={loading}
                          tone="ghost"
                          label="Hold to retry"
                          icon={<IconSymbol name="arrow.clockwise" size={14} color={Palette.textFaint} />}
                          style={styles.retry}
                          textStyle={styles.retryText}
                        />
                      </Animated.View>
                    ) : <Typing />}
                  </View>
                </View>
              </Animated.View>
            )) : (
              <Animated.View entering={FadeIn.duration(300)} style={styles.welcome}>
                <View style={styles.hero}>
                  <View style={styles.heroIcon}><Image source={require('../../assets/logo/Aque-logo.png')} style={{ width: 44, height: 44 }} resizeMode="contain" /></View>
                  <Text style={styles.heroTitle}>Ask me about your fish</Text>
                  <Text style={styles.heroText}>
                    Health, feeding, tank mates and water. {fishNames.length ? `I know you keep ${fishNames.join(', ')}.` : ''}
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Pick a topic</Text>
                <View style={styles.topics}>
                  {TOPICS.map((item) => {
                    const active = topic === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setTopic(active ? null : item.id)}
                        style={[styles.topic, { borderColor: `${item.color}40` }, active && { backgroundColor: `${item.color}26`, borderColor: item.color }]}
                        accessibilityState={{ selected: active }}
                      >
                        <View style={[styles.topicIcon, { backgroundColor: `${item.color}26` }]}>
                          <IconSymbol name={item.icon as any} size={14} color={item.color} />
                        </View>
                        <Text style={[styles.topicText, active && styles.topicTextActive]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.sectionLabel}>{activeTopic ? `${activeTopic.label}: hold a question to ask it` : 'Or hold a question to ask it'}</Text>
                <View style={{ gap: 8 }}>
                  {(activeTopic
                    ? activeTopic.questions.map((question) => ({ topic: activeTopic, question }))
                    : TOPICS.slice(0, 3).map((item) => ({ topic: item, question: item.questions[0] }))
                  ).map(({ topic: itemTopic, question }) => (
                    <Animated.View key={question} entering={FadeIn.duration(220)}>
                      <HoldAction
                        onComplete={() => { setTopic(itemTopic.id); void sendMessage(question); }}
                        style={[styles.starter, { borderColor: `${itemTopic.color}33` }]}
                        contentStyle={styles.starterContent}
                        accessibilityLabel={question}
                      >
                        <View style={[styles.starterBar, { backgroundColor: itemTopic.color }]} />
                        <Text style={styles.starterText}>{question}</Text>
                        <IconSymbol name="arrow.up" size={16} color={itemTopic.color} />
                      </HoldAction>
                    </Animated.View>
                  ))}
                </View>

                <View style={styles.context}>
                  <Text style={styles.sectionLabel}>Answers use these tanks and fish</Text>
                  <ContextPicker
                    tanks={tanks}
                    fish={fish}
                    plants={plants}
                    selection={selection}
                    onSelectionChange={setSelection}
                    accent={activeTopic?.color}
                  />
                </View>
              </Animated.View>
            )}
          </ScrollView>

          <InputBar
            initialText={params.prefillText ?? ''}
            initialMediaUri={params.prefillMediaUri ?? null}
            initialMediaUris={pendingMediaUris}
            initialMediaType={params.prefillMediaType ?? null}
            showOptions={showMediaOptions}
            onShowOptionsChange={setShowMediaOptions}
            onSend={(message, mediaUri) => sendMessage(message, undefined, mediaUri)}
            disabled={loading}
            draft={draft}
          />
          <Text style={styles.disclaimer}>Guidance only. For a very sick fish, talk to an aquatic vet.</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={historyVisible} transparent animationType="slide" onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.sheetWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setHistoryVisible(false)} accessibilityLabel="Close past chats" />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Past chats</Text>
            <Text style={styles.sheetSub}>Hold a chat to open it. Hold the bin to delete.</Text>
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
              {chats.length ? chats.map((chat) => (
                <View key={chat.id} style={styles.chatRow}>
                  <HoldAction onComplete={() => { void openChat(chat); }} style={styles.chatOpen} contentStyle={styles.chatOpenContent} accessibilityLabel={`Open ${chat.title}`}>
                    <IconSymbol name="clock" size={16} color={Palette.primaryBright} />
                    <View style={styles.flex}>
                      <Text style={styles.chatTitle} numberOfLines={1}>{chat.title}</Text>
                      <Text style={styles.chatDate}>{new Date(chat.updatedAt).toLocaleDateString()}</Text>
                    </View>
                  </HoldAction>
                  <HoldAction onComplete={() => { void removeChat(chat); }} tone="danger" speed="confirm" accessibilityLabel={`Delete ${chat.title}`} style={styles.iconBubble} contentStyle={{ gap: 0 }}>
                    <IconSymbol name="trash" size={18} color={Palette.dangerText} />
                  </HoldAction>
                </View>
              )) : <Text style={styles.empty}>Your chats will show up here.</Text>}
            </ScrollView>
            <HoldAction onComplete={newChat} tone="primary" label="Hold to start a new chat" icon={<IconSymbol name="plus" size={18} color={Palette.text} />} style={{ minHeight: 54 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const value = useSharedValue(0.3);
  useEffect(() => {
    value.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0.3, { duration: 320 })), -1));
  }, [delay, value]);
  const style = useAnimatedStyle(() => ({ opacity: value.value, transform: [{ translateY: (1 - value.value) * 3 }] }));
  return <Animated.View style={[styles.typingDot, style]} />;
}

function Typing() {
  return (
    <View style={styles.typing} accessibilityLabel="The assistant is typing">
      <TypingDot delay={0} />
      <TypingDot delay={160} />
      <TypingDot delay={320} />
      <Text style={styles.typingText}>Checking…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: Palette.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Palette.border },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 30, height: 30 },
  title: { color: Palette.text, fontSize: 18, fontFamily: 'Montserrat_700Bold' },
  subtitle: { color: Palette.textFaint, fontSize: 12 },
  headerActions: { flexDirection: 'row', gap: 6 },
  iconBubble: { width: 44, height: 44, minHeight: 44, borderRadius: 22, paddingHorizontal: 0 },

  scrollContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  turn: { gap: 10, marginBottom: 18 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: Palette.primary, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  userImages: { flexDirection: 'row', gap: 6, marginTop: 8 },
  userImage: { width: 64, height: 64, borderRadius: 10 },
  assistantRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  retry: { alignSelf: 'flex-start', minHeight: 32, paddingHorizontal: 10, marginTop: 6 },
  retryText: { color: Palette.textFaint, fontSize: 12 },

  typing: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Palette.surfaceRaised, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, borderTopLeftRadius: 6 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Palette.primaryBright },
  typingText: { color: Palette.textFaint, fontSize: 12, marginLeft: 6 },

  welcome: { gap: 12 },
  hero: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  heroTitle: { color: Palette.text, fontSize: 24, fontFamily: 'Montserrat_700Bold', textAlign: 'center' },
  heroText: { color: Palette.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  sectionLabel: { color: Palette.textFaint, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Montserrat_600SemiBold', marginTop: 6 },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border },
  topicIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  starterBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  topicText: { color: Palette.textMuted, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' },
  topicTextActive: { color: Palette.text },
  starter: { borderRadius: 18, minHeight: 54 },
  starterContent: { justifyContent: 'space-between', gap: 12 },
  starterText: { flex: 1, color: Palette.text, fontSize: 14, lineHeight: 20 },
  context: { gap: 4, marginTop: 4 },

  disclaimer: { color: Palette.textFaint, fontSize: 10, textAlign: 'center', paddingBottom: 6 },

  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,7,10,0.6)' },
  sheet: { backgroundColor: Palette.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 0, paddingBottom: 32, borderWidth: 1, borderColor: Palette.border },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Palette.borderStrong, marginVertical: 10 },
  sheetTitle: { color: Palette.text, fontSize: 22, fontFamily: 'Montserrat_700Bold' },
  sheetSub: { color: Palette.textFaint, fontSize: 12, marginTop: 4 },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatOpen: { flex: 1, borderRadius: 18, minHeight: 58 },
  chatOpenContent: { justifyContent: 'flex-start', gap: 12 },
  chatTitle: { color: Palette.text, fontSize: 14, fontFamily: 'Montserrat_600SemiBold' },
  chatDate: { color: Palette.textFaint, fontSize: 12, marginTop: 2 },
  empty: { color: Palette.textMuted, textAlign: 'center', paddingVertical: 24 },
});
