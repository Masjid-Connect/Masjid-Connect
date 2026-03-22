import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography, springs, components, timing, layout } from '@/constants/Theme';
import { patterns } from '@/lib/layoutGrid';
import { useAuth } from '@/contexts/AuthContext';
import { SkiaAtmosphericGradient, IslamicPattern, SolarLight } from '@/components/brand';
import { getAtmosphericGradient } from '@/lib/prayerGradients';

/**
 * Google "G" logo via Skia — per Google branding guidelines (Dec 2025).
 * Standard multicolor "G" at the given size. Returns null on web.
 */
const GOOGLE_G_PATHS = [
  { d: 'M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z', color: '#FFC107' },
  { d: 'M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z', color: '#FF3D00' },
  { d: 'M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z', color: '#4CAF50' },
  { d: 'M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z', color: '#1976D2' },
];

const GoogleGLogo = ({ size = 18 }: { size?: number }) => {
  if (Platform.OS === 'web') return null;

  const { Canvas, Path: SkiaPath, Group, Skia } = require('@shopify/react-native-skia');
  const scale = size / 48;

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale }]}>
        {GOOGLE_G_PATHS.map((p, i) => {
          const path = Skia.Path.MakeFromSVGString(p.d);
          return path ? <SkiaPath key={i} path={path} color={p.color} /> : null;
        })}
      </Group>
    </Canvas>
  );
};

/**
 * Animated action button wrapper — staggered fade-in from bottom.
 */
const AnimatedButton = ({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) => {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : 20);

  useEffect(() => {
    if (reducedMotion) return;
    const delay = timing.slow + index * (timing.staggerOffset + 20);
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delay, withSpring(0, springs.gentle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

/**
 * Feature card — community value proposition with icon + text.
 */
const FeatureCard = ({
  icon,
  titleKey,
  subtitleKey,
  index,
  colors,
  isDark,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  titleKey: string;
  subtitleKey: string;
  index: number;
  colors: ReturnType<typeof getColors>;
  isDark: boolean;
}) => {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : 16);

  useEffect(() => {
    if (reducedMotion) return;
    const delay = 600 + index * 120;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delay, withSpring(0, springs.gentle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.featureCard, animatedStyle]}>
      <View style={[styles.featureIconBox, { backgroundColor: isDark ? 'rgba(240, 208, 96, 0.12)' : 'rgba(191, 155, 48, 0.10)' }]}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={styles.featureTextBox}>
        <Text style={[typography.subhead, { color: colors.text, fontWeight: '600' }]}>
          {t(titleKey)}
        </Text>
        <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
          {t(subtitleKey)}
        </Text>
      </View>
    </Animated.View>
  );
};

export default function WelcomeScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { continueAsGuest, loginWithSocial } = useAuth();
  const { width, height } = useWindowDimensions();

  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Logo entrance animation ────────────────────────────
  const reducedMotion = useReducedMotion();
  const logoOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const logoScale = useSharedValue(reducedMotion ? 1 : 0.95);
  const taglineOpacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));
    logoScale.value = withDelay(200, withSpring(1, springs.gentle));
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  // ─── Atmospheric gradient (default/neutral prayer sky) ──
  const gradientColors = getAtmosphericGradient(null, isDark);

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
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'salafimasjid' });
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36),
      );

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };
        
      console.log("CLIENT ID:", process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
      
      const authRequest = new AuthSession.AuthRequest({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false, // ✅ THIS FIXES YOUR ERROR
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

  const alphaColors = getAlpha(effectiveScheme);
  const isLoading = appleLoading || googleLoading;

  // Google button colors per official branding guidelines (Dec 2025)
  const googleBtnBg = isDark ? '#131314' : palette.white;
  const googleBtnBorder = isDark ? '#8E918F' : '#747775';
  const googleBtnText = isDark ? '#E3E3E3' : '#1F1F1F';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ─── Atmosphere: Skia GPU gradient + Islamic pattern + Solar light ─── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <SkiaAtmosphericGradient
          width={width}
          height={height}
          colors={gradientColors}
        />
        <IslamicPattern
          width={width}
          height={height}
          opacity={patterns.opacity}
          tileSize={patterns.tileSize}
        />
        <SolarLight
          prayer="dhuhr"
          width={width}
          height={height}
          isDark={isDark}
        />
      </View>

      {/* ─── Zone 1: Identity + community framing ─── */}
      <ScrollView
        style={styles.identityScroll}
        contentContainerStyle={[styles.identityZone, { paddingTop: insets.top + spacing['4xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={logoAnimatedStyle}>
          <Image
            source={require('@/assets/images/Masjid_Logo.png')}
            style={[styles.logo, isDark && { tintColor: colors.text }]}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={taglineAnimatedStyle}>
          <Text style={[typography.title2, { color: colors.text, textAlign: 'center', marginTop: spacing.xl }]}>
            {t('welcome.communityHeadline')}
          </Text>
          <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            {t('welcome.communitySubtitle')}
          </Text>
        </Animated.View>

        {/* ─── Feature cards — community value propositions ─── */}
        <View style={styles.featureCards}>
          <FeatureCard
            icon="time-outline"
            titleKey="welcome.featurePrayer"
            subtitleKey="welcome.featurePrayerHint"
            index={0}
            colors={colors}
            isDark={isDark}
          />
          <FeatureCard
            icon="megaphone-outline"
            titleKey="welcome.featureAnnouncements"
            subtitleKey="welcome.featureAnnouncementsHint"
            index={1}
            colors={colors}
            isDark={isDark}
          />
          <FeatureCard
            icon="calendar-outline"
            titleKey="welcome.featureEvents"
            subtitleKey="welcome.featureEventsHint"
            index={2}
            colors={colors}
            isDark={isDark}
          />
        </View>
      </ScrollView>

      {/* ─── Zone 2: Actions (bottom — frosted card with auth buttons) ─── */}
      <View
        style={[
          styles.actionsZone,
          {
            paddingBottom: insets.bottom + spacing.lg,
            backgroundColor: alphaColors.frostedBg,
            borderTopColor: alphaColors.frostedBorder,
          },
        ]}
      >
        {error ? (
          <Text style={[typography.callout, { color: colors.urgent, textAlign: 'center', marginBottom: spacing.md }]}>
            {error}
          </Text>
        ) : null}

        {/* Google Sign In — official branding: fill, 1px stroke, multicolor G */}
        <AnimatedButton index={0}>
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
        </AnimatedButton>

        {/* Apple Sign In — iOS only */}
        {Platform.OS === 'ios' && (
          <AnimatedButton index={1}>
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
          </AnimatedButton>
        )}

        {/* Email sign up — secondary, outlined in Sacred Blue */}
        <AnimatedButton index={Platform.OS === 'ios' ? 2 : 1}>
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
        </AnimatedButton>

        {/* Sign in text link */}
        <AnimatedButton index={Platform.OS === 'ios' ? 3 : 2}>
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
        </AnimatedButton>

        {/* Guest — barely visible at the very bottom */}
        <AnimatedButton index={Platform.OS === 'ios' ? 4 : 3}>
          <TouchableOpacity
            onPress={handleContinueAsGuest}
            disabled={isLoading}
            style={styles.guestLink}
          >
            <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center' }]}>
              {t('welcome.continueAsGuest')}
            </Text>
          </TouchableOpacity>
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // ─── Zone 1: Identity + community framing ────
  identityScroll: {
    flex: 1,
  },
  identityZone: {
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing.xl,
  },
  logo: {
    width: 240,
    height: 240 * 0.28,
  },
  featureCards: {
    marginTop: spacing['2xl'],
    width: '100%',
    gap: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextBox: {
    flex: 1,
    marginStart: spacing.md,
  },

  // ─── Zone 2: Actions (bottom — semi-transparent card) ──────
  actionsZone: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: components.button.height,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    marginEnd: spacing.sm,
  },
  appleIcon: {
    marginEnd: spacing.sm,
  },
  authButtonText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    marginStart: spacing.sm,
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
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});
