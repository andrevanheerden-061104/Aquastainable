// Second sign-in step: type the 6-digit code from your email.
// No submit button: it checks the code by itself when the 6th digit goes in.
// The phone keyboard offers the code from the email (oneTimeCode / one-time-code).
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import HoldAction from '@/components/gestures/HoldAction';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/palette';
import { auth } from '@/firebase';

import { useAuthApi } from './hooks/useAuthApi';

const LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuthApi();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [status, setStatus] = useState<'sending' | 'ready' | 'checking' | 'done'>('sending');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const shake = useSharedValue(0);

  const requestCode = useCallback(async () => {
    setStatus('sending');
    setMessage('');
    try {
      const result = await sendOtp();
      setMaskedEmail(result.email);
      setCooldown(result.resendInSeconds || 30);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send the code.');
    } finally {
      setStatus('ready');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [sendOtp]);

  useEffect(() => { void requestCode(); }, [requestCode]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const check = useCallback(async (value: string) => {
    setStatus('checking');
    setMessage('');
    try {
      await verifyOtp(value);
      setStatus('done');
      setTimeout(() => router.replace('/loading'), 450);
    } catch (error) {
      setStatus('ready');
      setCode('');
      setMessage(error instanceof Error ? error.message : 'That code is not right.');
      shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 }));
      inputRef.current?.focus();
    }
  }, [router, shake, verifyOtp]);

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    if (digits.length === LENGTH && status === 'ready') void check(digits);
  };

  const useDifferentAccount = async () => {
    await signOut(auth);
    router.replace('/signin');
  };

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <View style={styles.iconWrap}>
          <IconSymbol name={status === 'done' ? 'checkmark' : 'envelope'} size={30} color={status === 'done' ? Palette.success : Palette.primaryBright} />
        </View>
        <Text style={styles.title}>{status === 'done' ? 'You are in!' : 'Check your email'}</Text>
        <Text style={styles.subtitle}>
          {status === 'sending' ? 'Sending your code…' : `We sent a 6-digit code to ${maskedEmail || 'your email'}. Type it below.`}
        </Text>

        <Pressable onPress={() => inputRef.current?.focus()} accessibilityLabel="Code input">
          <Animated.View style={[styles.boxes, shakeStyle]}>
            {Array.from({ length: LENGTH }).map((_, index) => {
              const digit = code[index] || '';
              const active = index === code.length && status === 'ready';
              return (
                <View key={index} style={[styles.box, active && styles.boxActive, !!digit && styles.boxFilled, status === 'done' && styles.boxDone]}>
                  <Text style={styles.digit}>{digit}</Text>
                </View>
              );
            })}
          </Animated.View>
        </Pressable>

        {/* One hidden input drives all six boxes (best for paste + SMS/email autofill). */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={LENGTH}
          editable={status === 'ready'}
          style={styles.hiddenInput}
          accessibilityLabel="6-digit code"
        />

        <View style={styles.statusRow}>
          {status === 'checking' ? <ActivityIndicator color={Palette.primaryBright} /> : null}
          {message ? <Text style={styles.error}>{message}</Text> : null}
          {!message && status === 'ready' ? <Text style={styles.hint}>The code works for 10 minutes.</Text> : null}
        </View>

        <View style={styles.actions}>
          <HoldAction
            onComplete={() => { void requestCode(); }}
            disabled={cooldown > 0 || status !== 'ready'}
            label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Hold to resend code'}
            icon={<IconSymbol name="arrow.clockwise" size={18} color={Palette.text} />}
          />
          <Pressable onPress={useDifferentAccount} style={styles.linkWrap}>
            <Text style={styles.link}>Use a different account</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  title: { color: Palette.text, fontSize: 30, fontFamily: 'Montserrat_700Bold', marginBottom: 8 },
  subtitle: { color: Palette.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 30 },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: { flex: 1, aspectRatio: 0.8, maxWidth: 54, borderRadius: 14, backgroundColor: Palette.surfaceRaised, borderWidth: 1.5, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: Palette.primaryBright },
  boxFilled: { borderColor: Palette.primaryBorder, backgroundColor: Palette.primarySoft },
  boxDone: { borderColor: Palette.success, backgroundColor: Palette.successSoft },
  digit: { color: Palette.text, fontSize: 26, fontFamily: 'Montserrat_700Bold' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  statusRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  error: { color: Palette.dangerText, fontSize: 14, flex: 1 },
  hint: { color: Palette.textFaint, fontSize: 13 },
  actions: { marginTop: 18, gap: 16 },
  linkWrap: { alignSelf: 'center', padding: 6 },
  link: { color: Palette.textMuted, fontSize: 14, textDecorationLine: 'underline' },
});
