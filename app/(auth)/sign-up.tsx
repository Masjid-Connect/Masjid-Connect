import React, { useState, useRef } from 'react';
import {
  Image,
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  useColorScheme,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors } from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { KozoPaperBackground } from '@/components/ui/KozoPaperBackground';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email.';
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 8) errs.password = 'At least 8 characters.';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignUp = async () => {
    setGeneralError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      // After registration, navigate to mosque search for onboarding
      router.replace('/mosque-search');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      if (message.includes('400')) {
        setGeneralError('An account with this email may already exist.');
      } else {
        setGeneralError('Could not connect. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KozoPaperBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing['2xl'] },
          ]}
          keyboardShouldPersistTaps="handled">
          {/* Brand Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/splash-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <Text style={[typography.title1, { color: colors.text, textAlign: 'center' }]}>
            Join your community
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing['2xl'] },
            ]}>
            Create an account to connect with your mosque
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              returnKeyType="next"
              error={errors.name}
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <TextInput
              ref={emailRef}
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              error={errors.email}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <TextInput
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
              error={errors.password}
              placeholder="At least 8 characters"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />

            <TextInput
              ref={confirmRef}
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              error={errors.confirmPassword}
              onSubmitEditing={handleSignUp}
            />

            {generalError ? (
              <Text style={[typography.callout, { color: colors.urgent, marginBottom: spacing.md }]}>
                {generalError}
              </Text>
            ) : null}

            <Button title="Create Account" onPress={handleSignUp} loading={loading} />
          </View>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[typography.body, { color: colors.tint, fontWeight: '600' }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </KozoPaperBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 220,
    height: 132,
  },
  form: {
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
});
