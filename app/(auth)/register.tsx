import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/Theme';
import { useAuth } from '@/contexts/AuthContext';
import { useSocialAuth } from '@/hooks/useSocialAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const { register } = useAuth();
  const { signInWithApple, signInWithGoogle, loading: socialLoading, appleAvailable } = useSocialAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const anyLoading = loading || socialLoading !== null;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert(t('auth.missingFields'), t('auth.enterAllFields'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('auth.weakPassword'), t('auth.weakPasswordHint'));
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (e) {
      const message = e instanceof Error ? e.message : t('auth.registerFailedHint');
      Alert.alert(t('auth.registerFailed'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/Masjid_Logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={[typography.title1, { color: colors.text, marginBottom: spacing.lg }]}>{t('auth.register')}</Text>

        {/* Social Login Buttons */}
        {appleAvailable && (
          <TouchableOpacity
            onPress={signInWithApple}
            disabled={anyLoading}
            style={[styles.socialButton, { backgroundColor: effectiveScheme === 'dark' ? '#FFFFFF' : '#000000' }]}
          >
            {socialLoading === 'apple' ? (
              <ActivityIndicator color={effectiveScheme === 'dark' ? '#000000' : '#FFFFFF'} />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color={effectiveScheme === 'dark' ? '#000000' : '#FFFFFF'} />
                <Text style={[typography.callout, { color: effectiveScheme === 'dark' ? '#000000' : '#FFFFFF', marginLeft: spacing.sm }]}>
                  {t('auth.continueWithApple')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={signInWithGoogle}
          disabled={anyLoading}
          style={[styles.socialButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }]}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={[typography.callout, { color: colors.text, marginLeft: spacing.sm }]}>
                {t('auth.continueWithGoogle')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
          <Text style={[typography.caption1, { color: colors.textSecondary, marginHorizontal: spacing.md }]}>
            {t('auth.orWithEmail')}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
        </View>

        {/* Email/Password Form */}
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder={t('auth.name')}
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          editable={!anyLoading}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!anyLoading}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder={t('auth.passwordHint')}
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!anyLoading}
        />
        <TouchableOpacity
          onPress={handleRegister}
          disabled={anyLoading}
          style={[styles.button, { backgroundColor: colors.tint }]}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={[typography.callout, { color: '#FFFFFF' }]}>{t('auth.register')}</Text>}
        </TouchableOpacity>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={[typography.body, { color: colors.accent }]}>{t('auth.hasAccount')}</Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity onPress={() => router.back()} style={styles.link}>
          <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('auth.back')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 260,
    height: 72,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  link: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});
