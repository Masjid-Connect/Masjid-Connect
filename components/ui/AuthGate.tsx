import React, { useEffect } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { borderRadius, spacing, springs, typography } from '@/constants/Theme';
import { IslamicPattern } from '@/components/brand/IslamicPattern';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  const headlineKey = variant === 'announcements'
    ? 'gate.announcements.headline'
    : 'gate.events.headline';
  const subtitleKey = variant === 'announcements'
    ? 'gate.announcements.subtitle'
    : 'gate.events.subtitle';

  // ─── Staggered entrance animations ────────────────────
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.92);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslateY = useSharedValue(12);

  useEffect(() => {
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
    logoScale.value = withDelay(100, withSpring(1, springs.gentle));
    contentOpacity.value = withDelay(300, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }));
    contentTranslateY.value = withDelay(300, withSpring(0, springs.gentle));
    ctaOpacity.value = withDelay(500, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
    ctaTranslateY.value = withDelay(500, withSpring(0, springs.gentle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const isDark = effectiveScheme === 'dark';
  const valueProps = VALUE_PROPS[variant];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Subtle Islamic pattern background */}
      <IslamicPattern
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        color={isDark ? palette.sacredBlueLight : palette.sacredBlue}
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
                <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                  {t(prop.subtitleKey)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ─── CTA zone ─── */}
      <Animated.View style={[styles.ctaZone, ctaStyle]}>
        <Pressable
          onPress={() => router.push('/(auth)/welcome')}
          style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
        >
          <Text style={[typography.headline, { color: colors.onPrimary }]}>
            {t('gate.createAccount')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(auth)/sign-in')}
          style={styles.secondaryBtn}
        >
          <Text style={[typography.subhead, { color: colors.tint }]}>
            {t('gate.alreadyHaveAccount')}
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
    marginRight: spacing.lg,
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
    height: 52,
    borderRadius: borderRadius.xl,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
