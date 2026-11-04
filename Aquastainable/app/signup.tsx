import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import AuthField from '@/components/auth/AuthField';
import AuthLayout from '@/components/auth/AuthLayout';
import SwipeToConfirm from '@/components/gestures/SwipeToConfirm';
import { Palette } from '@/constants/palette';

import { OTP_ENABLED } from './hooks/authHeader';
import { useAuthApi } from './hooks/useAuthApi';

export default function SignUpScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp } = useAuthApi();
  const [loading, setLoading] = useState(false); // covers the whole sign-up, for the overlay
  const [formError, setFormError] = useState('');

  const handleSignUp = async () => {
    if (loading) return;
    setFormError('');
    if (!username.trim()) {
      setFormError('Please enter a username.');
      return;
    }
    if (!email.trim()) {
      setFormError('Please enter an email address.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await signUp({ email: email.trim(), password, username: username.trim(), profileImageUrl: null });
      router.replace(OTP_ENABLED ? '/verify' : '/loading');
    } catch (err) {
      setLoading(false);
      setFormError(err instanceof Error ? err.message : 'Unable to create account.');
    }
  };

  return (
    <AuthLayout
      mode="signup"
      loading={loading}
      loadingMessage="Creating your account…"
      hero={require('../assets/hero/oranda-goldfish.jpg')}
      heroShift={-125}
      titleLight="Start your"
      titleBold="aquarium journey"
      subtitle="Track your tanks, test your water and get simple fish advice."
    >
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <AuthField icon="person" value={username} onChangeText={setUsername} placeholder="Username" autoCapitalize="none" textContentType="username" />
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
      <AuthField icon="lock" secret value={password} onChangeText={setPassword} placeholder="Password (6+ characters)" textContentType="newPassword" />
      <AuthField icon="lock" secret value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" textContentType="newPassword" />
      <SwipeToConfirm label="Swipe to create account" onConfirm={handleSignUp} disabled={loading} tone="glass" style={styles.swipe} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: Palette.dangerText, fontSize: 13, textAlign: 'center', paddingHorizontal: 6 },
  swipe: { marginTop: 4 },
});
