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
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/Theme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export default function SignInScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<RNTextInput>(null);

  const handleSignIn = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError(t('auth.enterEmailPassword'));
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      if (message.includes('401')) {
        setError(t('auth.loginFailedHint'));
      } else {
        setError(t('auth.networkError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing['4xl'] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/Masjid_Logo.png')}
              style={[styles.logo, effectiveScheme === 'dark' && { tintColor: colors.text }]}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <Text style={[typography.title2, { color: colors.text, textAlign: 'center' }]}>
            {t('auth.welcomeBack')}
          </Text>
          <Text
            style={[
              typography.subhead,
              { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing['3xl'] },
            ]}>
            {t('auth.signInSubtitle')}
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <TextInput
              ref={passwordRef}
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />

            {error ? (
              <Text style={[typography.callout, { color: colors.urgent, textAlign: 'center', marginBottom: spacing.md }]}>
                {error}
              </Text>
            ) : null}

            <Button
              title={t('auth.login')}
              onPress={handleSignIn}
              loading={loading}
              style={styles.submitButton}
            />
          </View>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={[typography.subhead, { color: colors.textSecondary }]}>
              {t('auth.noAccountQuestion')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={[typography.subhead, { color: colors.tint, fontWeight: '600' }]}>
                {t('auth.signUp')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['3xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: 220,
    height: 220 * 0.28, // consistent aspect ratio
  },
  form: {
    marginBottom: spacing.lg,
  },
  submitButton: {
    borderRadius: borderRadius.xl,
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
