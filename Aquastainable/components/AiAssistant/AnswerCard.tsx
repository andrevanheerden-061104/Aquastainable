// Renders the assistant's short answer format:
//   **Headline**          -> big first line (the direct answer)
//   plain line            -> one-sentence explanation
//   **Do this** / **Watch for** -> small section label
//   - item                -> bullet with a dot
//   [label](https://...)  -> link
// Anything else is shown as plain text, so older saved answers still display.
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/palette';

type Block =
  | { kind: 'headline'; text: string }
  | { kind: 'label'; text: string }
  | { kind: 'bullet'; text: string; index: number }
  | { kind: 'text'; text: string };

const stripBold = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1');

export function parseAnswer(answer: string): Block[] {
  const blocks: Block[] = [];
  let bulletIndex = 0;
  answer.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line, lineIndex) => {
    const clean = line.replace(/^#+\s*/, '');
    const bullet = clean.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      blocks.push({ kind: 'bullet', text: bullet[1], index: bulletIndex++ });
      return;
    }
    bulletIndex = 0;
    const wholeBold = clean.match(/^\*\*(.+?)\*\*:?$/);
    if (wholeBold) {
      const isFirst = blocks.length === 0 && lineIndex === 0;
      blocks.push({ kind: isFirst ? 'headline' : 'label', text: wholeBold[1].replace(/:$/, '') });
      return;
    }
    blocks.push({ kind: blocks.length === 0 ? 'headline' : 'text', text: clean });
  });
  return blocks;
}

function RichText({ text, style }: { text: string; style: any }) {
  // [label](url) links + **bold** spans
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
        if (link) return <Text key={index} style={styles.link} onPress={() => Linking.openURL(link[2])}>{link[1]}</Text>;
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <Text key={index} style={styles.bold}>{bold[1]}</Text>;
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}

export default function AnswerCard({ answer, tone = 'default' }: { answer: string; tone?: 'default' | 'urgent' | 'muted' }) {
  const blocks = parseAnswer(answer);
  const urgent = tone === 'urgent' || /^(act now|stop)\b/i.test(stripBold(blocks[0]?.text || ''));

  return (
    <View style={[styles.card, urgent && styles.cardUrgent, tone === 'muted' && styles.cardMuted]}>
      {blocks.map((block, index) => {
        if (block.kind === 'headline') {
          // A long single-line reply (e.g. "I can only help with fish...") reads better as body text.
          const long = blocks.length === 1 && block.text.length > 70;
          return <RichText key={index} text={stripBold(block.text)} style={[long ? styles.single : styles.headline, urgent && styles.headlineUrgent]} />;
        }
        if (block.kind === 'label') return <Text key={index} style={styles.label}>{block.text}</Text>;
        if (block.kind === 'bullet') {
          return (
            <View key={index} style={styles.bulletRow}>
              <View style={[styles.dot, urgent && styles.dotUrgent]} />
              <RichText text={block.text} style={styles.bulletText} />
            </View>
          );
        }
        return <RichText key={index} text={block.text} style={styles.body} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Palette.surfaceRaised, borderRadius: 22, borderTopLeftRadius: 6, padding: 16, gap: 8, borderWidth: 1, borderColor: Palette.border },
  cardUrgent: { borderColor: 'rgba(240,93,94,0.4)', backgroundColor: '#24191C' },
  cardMuted: { opacity: 0.85 },
  headline: { color: Palette.text, fontSize: 17, lineHeight: 24, fontFamily: 'Montserrat_700Bold' },
  headlineUrgent: { color: '#FFC9C9' },
  single: { color: Palette.text, fontSize: 15, lineHeight: 22 },
  label: { color: Palette.primaryBright, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Montserrat_700Bold', marginTop: 6 },
  body: { color: Palette.textMuted, fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.primaryBright, marginTop: 8 },
  dotUrgent: { backgroundColor: Palette.danger },
  bulletText: { flex: 1, color: Palette.text, fontSize: 14, lineHeight: 21 },
  link: { color: Palette.primaryBright, textDecorationLine: 'underline' },
  bold: { fontFamily: 'Montserrat_700Bold', color: Palette.text },
});
