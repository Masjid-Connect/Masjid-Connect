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

export default function SignUpScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('auth.nameRequired');
    if (!email.trim()) errs.email = t('auth.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = t('auth.emailInvalid');
    if (!password) errs.password = t('auth.passwordRequired');
    else if (password.length < 8) errs.password = t('auth.weakPasswordHint');
    if (password !== confirmPassword) errs.confirmPassword = t('auth.passwordsMismatch');
    if (!agreePrivacy || !agreeTerms) errs.consent = t('auth.consentRequired');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignUp = async () => {
    setGeneralError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      if (message.includes('400')) {
        setGeneralError(t('auth.accountExists'));
      } else {
        setGeneralError(t('auth.networkError'));
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
            { paddingTop: insets.top + spacing['3xl'] },
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
            {t('auth.joinCommunity')}
          </Text>
          <Text
            style={[
              typography.subhead,
              { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing['2xl'] },
            ]}>
            {t('auth.signUpSubtitle')}
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label={t('auth.name')}
              value={name}
              onChangeText={setName}
              autoComplete="name"
              returnKeyType="next"
              error={errors.name}
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <TextInput
              ref={emailRef}
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              returnKeyType="next"
              error={errors.email}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <TextInput
              ref={passwordRef}
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
              error={errors.password}
              placeholder={t('auth.passwordHint')}
              onSubmitEditing={() => confirmRef.current?.focus()}
            />

            <TextInput
              ref={confirmRef}
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              error={errors.confirmPassword}
              onSubmitEditing={handleSignUp}
            />

            {/* Consent Checkboxes */}
            <View style={styles.consentContainer}>
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setAgreePrivacy(!agreePrivacy)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreePrivacy }}
                accessibilityLabel={t('auth.agreeToPrivacy') + t('auth.privacyPolicyLink')}
              >
                <View style={[styles.checkbox, agreePrivacy && styles.checkboxChecked, agreePrivacy && { backgroundColor: colors.tint, borderColor: colors.tint }]} />
                <Text style={[typography.subhead, { color: colors.textSecondary, flex: 1 }]}>
                  {t('auth.agreeToPrivacy')}
                  <Text
                    style={{ color: colors.tint, fontWeight: '600' }}
                    onPress={() => router.push('/privacy')}
                  >
                    {t('auth.privacyPolicyLink')}
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setAgreeTerms(!agreeTerms)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreeTerms }}
                accessibilityLabel={t('auth.agreeToTerms') + t('auth.termsLink')}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked, agreeTerms && { backgroundColor: colors.tint, borderColor: colors.tint }]} />
                <Text style={[typography.subhead, { color: colors.textSecondary, flex: 1 }]}>
                  {t('auth.agreeToTerms')}
                  <Text
                    style={{ color: colors.tint, fontWeight: '600' }}
                    onPress={() => router.push('/terms')}
                  >
                    {t('auth.termsLink')}
                  </Text>
                </Text>
              </TouchableOpacity>

              {errors.consent ? (
                <Text style={[typography.footnote, { color: colors.urgent, marginTop: spacing.xs }]}>
                  {errors.consent}
                </Text>
              ) : null}
            </View>

            {generalError ? (
              <Text style={[typography.callout, { color: colors.urgent, textAlign: 'center', marginBottom: spacing.md }]}>
                {generalError}
              </Text>
            ) : null}

            <Button
              title={t('auth.register')}
              onPress={handleSignUp}
              loading={loading}
              style={styles.submitButton}
            />
          </View>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={[typography.subhead, { color: colors.textSecondary }]}>
              {t('auth.haveAccountQuestion')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[typography.subhead, { color: colors.tint, fontWeight: '600' }]}>
                {t('auth.login')}
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
    marginBottom: spacing.xl,
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
  consentContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#C0C0C0',
    marginTop: 2,
  },
  checkboxChecked: {
    borderWidth: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
