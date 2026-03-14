import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/Theme';
import { KozoPaperBackground } from '@/components/ui/KozoPaperBackground';
import { useAuth } from '@/contexts/AuthContext';

export default function WelcomeScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { continueAsGuest, loginWithSocial } = useAuth();

  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAppleSignIn = async () => {
    setError('');
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const name = credential.fullName
          ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
          : undefined;
        await loginWithSocial('apple', credential.identityToken, name || undefined);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError(t('welcome.socialFailed'));
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      // Use expo-auth-session for Google OAuth
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'masjidconnect' });
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36),
      );

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      const authRequest = new AuthSession.AuthRequest({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        extraParams: { nonce },
      });

      const result = await authRequest.promptAsync(discovery);

      if (result.type === 'success' && result.params.id_token) {
        await loginWithSocial('google', result.params.id_token);
      }
    } catch {
      setError(t('welcome.socialFailed'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    await continueAsGuest();
    router.replace('/(tabs)');
  };

  const isLoading = appleLoading || googleLoading;

  return (
    <KozoPaperBackground
      color={colors.background}
      showTexture={effectiveScheme !== 'dark'}
      style={{ paddingTop: insets.top }}
    >
      <View style={styles.container}>
        {/* Brand area */}
        <View style={styles.brandArea}>
          <Image
            source={require('@/assets/images/Masjid_Logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[typography.title1, { color: colors.text, textAlign: 'center', marginTop: spacing.xl }]}>
            {t('welcome.title')}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            {t('welcome.subtitle')}
          </Text>
        </View>

        {/* Auth buttons */}
        <View style={styles.buttonArea}>
          {error ? (
            <Text style={[typography.callout, { color: colors.urgent, textAlign: 'center', marginBottom: spacing.md }]}>
              {error}
            </Text>
          ) : null}

          {/* Apple Sign In — iOS only */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={handleAppleSignIn}
              disabled={isLoading}
              style={[styles.socialButton, styles.appleButton]}
              activeOpacity={0.8}
            >
              {appleLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                  <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>
                    {t('welcome.continueWithApple')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Google Sign In */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            style={[styles.socialButton, styles.googleButton, { borderColor: colors.separator }]}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#4285F4" />
                <Text style={[styles.socialButtonText, { color: colors.text }]}>
                  {t('welcome.continueWithGoogle')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
            <Text style={[typography.caption1, { color: colors.textSecondary, marginHorizontal: spacing.md }]}>
              {t('welcome.or')}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
          </View>

          {/* Email sign up */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/sign-up')}
            disabled={isLoading}
            style={[styles.socialButton, { backgroundColor: colors.tint }]}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
            <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>
              {t('welcome.createWithEmail')}
            </Text>
          </TouchableOpacity>

          {/* Sign in link */}
          <View style={styles.signInRow}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {t('welcome.haveAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
              <Text style={[typography.body, { color: colors.tint, fontWeight: '600' }]}>
                {t('welcome.signIn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guest option */}
        <View style={[styles.guestArea, { paddingBottom: insets.bottom + spacing.lg }]}>
          <TouchableOpacity onPress={handleContinueAsGuest} disabled={isLoading}>
            <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center' }]}>
              {t('welcome.continueAsGuest')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KozoPaperBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  brandArea: {
    alignItems: 'center',
    paddingTop: spacing['5xl'],
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: 280,
    height: 78,
  },
  buttonArea: {
    paddingHorizontal: spacing['2xl'],
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    minHeight: 50,
    marginBottom: spacing.md,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginStart: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  guestArea: {
    paddingVertical: spacing.xl,
  },
});
