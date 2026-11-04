import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import AuthField from '@/components/auth/AuthField';
import AuthLayout from '@/components/auth/AuthLayout';
import SwipeToConfirm from '@/components/gestures/SwipeToConfirm';
import { Palette } from '@/constants/palette';

import { OTP_ENABLED } from './hooks/authHeader';
import { useAuthApi } from './hooks/useAuthApi';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading, signIn } = useAuthApi();
  const [formError, setFormError] = useState('');

  const handleSignIn = async () => {
    setFormError('');
    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }
    try {
      await signIn({ email: email.trim(), password });
      // With 2FA on, go to the 6-digit code screen first.
      router.replace(OTP_ENABLED ? '/verify' : '/loading');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to sign in.');
    }
  };

  return (
    <AuthLayout
      mode="signin"
      hero={require('../assets/hero/betta-bubbles.jpg')}
      titleLight="Welcome"
      titleBold="back to your tanks"
      subtitle="Sign in to check your water, fish and plants."
    >
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <AuthField
        icon="envelope"
        value={email}
        onChangeText={setEmail}
        placeholder="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        autoComplete="email"
      />
      <AuthField
        icon="lock"
        secret
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        textContentType="password"
        autoComplete="password"
      />
      <SwipeToConfirm label="Swipe to sign in" onConfirm={handleSignIn} loading={loading} tone="glass" style={styles.swipe} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: Palette.dangerText, fontSize: 13, textAlign: 'center', paddingHorizontal: 6 },
  swipe: { marginTop: 4 },
});
