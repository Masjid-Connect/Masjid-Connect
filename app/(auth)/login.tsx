import React, { useState } from 'react';
import {
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

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/Theme';
import { auth } from '@/lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await auth.login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed. Check your email and password.';
      Alert.alert('Login failed', message);
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
        <Text style={[typography.title1, { color: colors.text, marginBottom: spacing.lg }]}>Sign in</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={[styles.button, { backgroundColor: colors.tint }]}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={[typography.callout, { color: '#FFFFFF' }]}>Sign in</Text>}
        </TouchableOpacity>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={[typography.body, { color: colors.accent }]}>Create an account</Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity onPress={() => router.back()} style={styles.link}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Back</Text>
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
