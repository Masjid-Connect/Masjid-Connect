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
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/Theme';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      // AuthContext updates isAuthenticated → _layout.tsx redirects to /(tabs)
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
            style={[styles.logo, effectiveScheme === 'dark' && { tintColor: colors.text }]}
            resizeMode="contain"
          />
        </View>
        <Text style={[typography.title1, { color: colors.text, marginBottom: spacing.lg }]}>{t('auth.register')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder={t('auth.name')}
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          editable={!loading}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder={t('auth.passwordHint')}
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={[styles.button, { backgroundColor: colors.tint }]}
        >
          {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[typography.callout, { color: colors.onPrimary }]}>{t('auth.register')}</Text>}
        </TouchableOpacity>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={[typography.body, { color: colors.accent }]}>{t('auth.hasAccount')}</Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity onPress={() => router.back()} style={styles.link}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{t('auth.back')}</Text>
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
