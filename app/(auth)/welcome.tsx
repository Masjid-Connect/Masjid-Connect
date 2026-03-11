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
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/Theme';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Atmosphere gradient — "Dawn in the Musalla"
 * Soft sky tones: a barely-there wash of warm blue fading into limestone.
 * Dark mode: deep indigo fading into true black.
 */
const ATMOSPHERE = {
  light: ['#E8EFF5', '#EDE9E3', palette.limestone] as const,
  dark: ['#0A1628', '#0D0D12', palette.black] as const,
};

/**
 * Google "G" logo as SVG — per Google branding guidelines (Dec 2025).
 * Standard multicolor "G" at the given size.
 */
const GoogleGLogo = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      fill="#FFC107"
    />
    <Path
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
      fill="#FF3D00"
    />
    <Path
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      fill="#4CAF50"
    />
    <Path
      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      fill="#1976D2"
    />
  </Svg>
);

export default function WelcomeScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
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

  // Google button colors per official branding guidelines (Dec 2025)
  const googleBtnBg = isDark ? '#131314' : palette.white;
  const googleBtnBorder = isDark ? '#8E918F' : '#747775';
  const googleBtnText = isDark ? '#E3E3E3' : '#1F1F1F';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ─── Zone 1: Atmosphere ─────────────────────────────── */}
      <LinearGradient
        colors={isDark ? [...ATMOSPHERE.dark] : [...ATMOSPHERE.light]}
        style={[styles.atmosphereZone, { paddingTop: insets.top }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* ─── Zone 2: Identity ───────────────────────────────── */}
      <View style={styles.identityZone}>
        <Image
          source={require('@/assets/images/Masjid_Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
          {t('welcome.tagline')}
        </Text>
      </View>

      {/* ─── Zone 3: Actions ────────────────────────────────── */}
      <View style={[styles.actionsZone, { paddingBottom: insets.bottom + spacing.lg }]}>

        {error ? (
          <Text style={[typography.callout, { color: colors.urgent, textAlign: 'center', marginBottom: spacing.md }]}>
            {error}
          </Text>
        ) : null}

        {/* Google Sign In — official branding: fill, 1px stroke, multicolor G */}
        <TouchableOpacity
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          style={[
            styles.authButton,
            {
              backgroundColor: googleBtnBg,
              borderColor: googleBtnBorder,
              borderWidth: 1,
            },
          ]}
          activeOpacity={0.8}
        >
          {googleLoading ? (
            <ActivityIndicator color={googleBtnText} size="small" />
          ) : (
            <>
              <View style={styles.googleIconContainer}>
                <GoogleGLogo size={20} />
              </View>
              <Text style={[styles.authButtonText, { color: googleBtnText }]}>
                {t('welcome.continueWithGoogle')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple Sign In — iOS only */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            onPress={handleAppleSignIn}
            disabled={isLoading}
            style={[
              styles.authButton,
              { backgroundColor: isDark ? palette.white : palette.black },
            ]}
            activeOpacity={0.8}
          >
            {appleLoading ? (
              <ActivityIndicator color={isDark ? palette.black : palette.white} size="small" />
            ) : (
              <>
                <Ionicons
                  name="logo-apple"
                  size={20}
                  color={isDark ? palette.black : palette.white}
                  style={styles.appleIcon}
                />
                <Text
                  style={[
                    styles.authButtonText,
                    { color: isDark ? palette.black : palette.white },
                  ]}
                >
                  {t('welcome.continueWithApple')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Email sign up — secondary, outlined in Sacred Blue */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-up')}
          disabled={isLoading}
          style={[
            styles.authButton,
            styles.emailButton,
            { borderColor: colors.tint },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.authButtonText, { color: colors.tint }]}>
            {t('welcome.signUpWithEmail')}
          </Text>
        </TouchableOpacity>

        {/* Sign in text link */}
        <View style={styles.signInRow}>
          <Text style={[typography.subhead, { color: colors.textSecondary }]}>
            {t('welcome.haveAccount')}{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={[typography.subhead, { color: colors.tint, fontWeight: '600' }]}>
              {t('welcome.signIn')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Guest — barely visible at the very bottom */}
        <TouchableOpacity
          onPress={handleContinueAsGuest}
          disabled={isLoading}
          style={styles.guestLink}
        >
          <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center' }]}>
            {t('welcome.continueAsGuest')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // ─── Zone 1: Atmosphere (top third — breathing room) ────
  atmosphereZone: {
    flex: 1,
    minHeight: 100,
  },

  // ─── Zone 2: Identity (center — brand presence) ─────────
  identityZone: {
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  logo: {
    width: 280,
    height: 78,
    marginTop: spacing.xl,
  },

  // ─── Zone 3: Actions (bottom — clear, generous spacing) ─
  actionsZone: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.sm,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    marginRight: spacing.sm,
  },
  appleIcon: {
    marginRight: spacing.sm,
  },
  authButtonText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  emailButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  guestLink: {
    marginTop: spacing['2xl'],
    paddingVertical: spacing.sm,
  },
});
