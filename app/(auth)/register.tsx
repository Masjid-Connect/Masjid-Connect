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

export default function RegisterScreen() {
  const router = useRouter();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter name, email, and password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Use at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await auth.register(email.trim(), password, name.trim());
      router.replace('/(tabs)');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed. Try again.';
      Alert.alert('Registration failed', message);
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
        <Text style={[typography.title1, { color: colors.text, marginBottom: spacing.lg }]}>Create account</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder="Name"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          editable={!loading}
        />
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
          placeholder="Password (min 8 characters)"
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
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={[typography.callout, { color: '#FFFFFF' }]}>Create account</Text>}
        </TouchableOpacity>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={[typography.body, { color: colors.accent }]}>Already have an account? Sign in</Text>
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
