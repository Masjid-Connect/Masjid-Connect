import React, { useEffect } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { borderRadius, components, layout, spacing, springs, typography } from '@/constants/Theme';
import { IslamicPattern } from '@/components/brand/IslamicPattern';

interface ValueProp {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  subtitleKey: string;
}

interface AuthGateProps {
  /** Which tab is gated — drives the headline and value props */
  variant: 'announcements' | 'events';
}

const VALUE_PROPS: Record<string, ValueProp[]> = {
  announcements: [
    { icon: 'megaphone-outline', titleKey: 'gate.announcements.prop1Title', subtitleKey: 'gate.announcements.prop1Subtitle' },
    { icon: 'notifications-outline', titleKey: 'gate.announcements.prop2Title', subtitleKey: 'gate.announcements.prop2Subtitle' },
    { icon: 'people-outline', titleKey: 'gate.announcements.prop3Title', subtitleKey: 'gate.announcements.prop3Subtitle' },
  ],
  events: [
    { icon: 'calendar-outline', titleKey: 'gate.events.prop1Title', subtitleKey: 'gate.events.prop1Subtitle' },
    { icon: 'notifications-outline', titleKey: 'gate.events.prop2Title', subtitleKey: 'gate.events.prop2Subtitle' },
    { icon: 'bookmark-outline', titleKey: 'gate.events.prop3Title', subtitleKey: 'gate.events.prop3Subtitle' },
  ],
};

/**
 * Premium auth gate screen — shown when guest users tap gated tabs.
 * Apple-quality design: logo, bismillah, value propositions, CTA.
 */
export const AuthGate = ({ variant }: AuthGateProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const headlineKey = variant === 'announcements'
    ? 'gate.announcements.headline'
    : 'gate.events.headline';
  const subtitleKey = variant === 'announcements'
    ? 'gate.announcements.subtitle'
    : 'gate.events.subtitle';

  // ─── Staggered entrance animations ────────────────────
  const logoOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const logoScale = useSharedValue(reducedMotion ? 1 : 0.92);
  const contentOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const contentTranslateY = useSharedValue(reducedMotion ? 0 : 16);
  const ctaOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const ctaTranslateY = useSharedValue(reducedMotion ? 0 : 12);

  useEffect(() => {
    if (reducedMotion) return;
    logoOpacity.value = withDelay(100, withSpring(1, springs.gentle));
    logoScale.value = withDelay(100, withSpring(1, springs.gentle));
    contentOpacity.value = withDelay(300, withSpring(1, springs.gentle));
    contentTranslateY.value = withDelay(300, withSpring(0, springs.gentle));
    ctaOpacity.value = withDelay(500, withSpring(1, springs.gentle));
    ctaTranslateY.value = withDelay(500, withSpring(0, springs.gentle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslateY.value }],
  }));

  // Scale-press animation for CTA buttons
  const primaryScale = useSharedValue(1);
  const secondaryScale = useSharedValue(1);

  const primaryScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: primaryScale.value }],
  }));
  const secondaryScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: secondaryScale.value }],
  }));

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const isDark = effectiveScheme === 'dark';
  const valueProps = VALUE_PROPS[variant];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Subtle Islamic pattern background */}
      <IslamicPattern
        width={screenWidth}
        height={screenHeight}
        color={isDark ? palette.sapphire400 : palette.sapphire700}
        opacity={0.03}
        tileSize={56}
      />

      {/* ─── Brand zone: logo ─── */}
      <Animated.View style={[styles.brandZone, logoStyle]}>
        <Image
          source={require('@/assets/images/Masjid_Logo.png')}
          style={[styles.logo, isDark && { tintColor: colors.text }]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ─── Content zone: headline + value props ─── */}
      <Animated.View style={[styles.contentZone, contentStyle]}>
        <Text style={[typography.title2, { color: colors.text, textAlign: 'center' }]}>
          {t(headlineKey)}
        </Text>
        <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
          {t(subtitleKey)}
        </Text>

        {/* Value propositions */}
        <View style={styles.propsContainer}>
          {valueProps.map((prop, i) => (
            <View key={i} style={styles.propRow}>
              <View style={[styles.propIcon, { backgroundColor: isDark ? colors.backgroundSecondary : colors.backgroundGrouped }]}>
                <Ionicons name={prop.icon} size={20} color={colors.accent} />
              </View>
              <View style={styles.propText}>
                <Text style={[typography.headline, { color: colors.text }]}>
                  {t(prop.titleKey)}
                </Text>
                <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: spacing['2xs'] }]}>
                  {t(prop.subtitleKey)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ─── CTA zone ─── */}
      <Animated.View style={[styles.ctaZone, ctaStyle]}>
        <AnimatedPressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(auth)/welcome');
          }}
          onPressIn={() => { primaryScale.value = withSpring(0.96, springs.snappy); }}
          onPressOut={() => { primaryScale.value = withSpring(1, springs.gentle); }}
          style={[styles.primaryBtn, { backgroundColor: colors.tint }, primaryScaleStyle]}
          accessibilityRole="button"
          accessibilityLabel={t('gate.createAccount')}
        >
          <Text style={[typography.headline, { color: colors.onPrimary }]}>
            {t('gate.createAccount')}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(auth)/sign-in');
          }}
          onPressIn={() => { secondaryScale.value = withSpring(0.96, springs.snappy); }}
          onPressOut={() => { secondaryScale.value = withSpring(1, springs.gentle); }}
          style={[styles.secondaryBtn, secondaryScaleStyle]}
          accessibilityRole="button"
          accessibilityLabel={t('gate.alreadyHaveAccount')}
        >
          <Text style={[typography.subhead, { color: colors.tint }]}>
            {t('gate.alreadyHaveAccount')}
          </Text>
        </AnimatedPressable>

        <Pressable
          onPress={() => router.back()}
          style={styles.guestBtn}
          accessibilityRole="button"
          accessibilityLabel={t('gate.continueAsGuest')}
        >
          <Text style={[typography.caption1, { color: colors.textTertiary }]}>
            {t('gate.continueAsGuest')}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  brandZone: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: 200,
    height: 56,
  },
  contentZone: {
    alignItems: 'center',
    width: '100%',
  },
  propsContainer: {
    marginTop: spacing['2xl'],
    width: '100%',
  },
  propRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  propIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: spacing.lg,
  },
  propText: {
    flex: 1,
  },
  ctaZone: {
    width: '100%',
    marginTop: spacing['2xl'],
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: components.button.height,
    borderRadius: borderRadius.xl,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  guestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.sm,
  },
});
