import React from 'react';
import { StyleSheet, ScrollView, Text, View, Image } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import Constants from 'expo-constants';
import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation, fontWeight } from '@/constants/Theme';

const GoldRule = ({ color }: { color: string }) => (
  <View style={styles.ruleContainer}>
    <View style={[styles.ruleLine, { backgroundColor: color }]} />
    <View style={[styles.ruleDiamond, { backgroundColor: color }]} />
    <View style={[styles.ruleLine, { backgroundColor: color }]} />
  </View>
);

const SectionNumber = ({ n, color }: { n: string; color: string }) => (
  <Text style={[styles.sectionNumber, { color }]}>{n}</Text>
);

export default function AboutScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.backgroundSecondary },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — logo IS the identity, no redundant text */}
        <View style={styles.hero}>
          <Image
            source={require('@/assets/images/Masjid_Logo.png')}
            style={[styles.logo, isDark && { tintColor: colors.text }]}
            resizeMode="contain"
          />
          <View style={[styles.versionPill, { backgroundColor: isDark ? colors.backgroundGrouped : colors.background }]}>
            <Text style={[typography.caption1, { color: colors.textSecondary, fontWeight: fontWeight.medium }]}>
              {t('about.version')} {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </View>

        {/* Tagline — pull-quote style */}
        <View style={styles.taglineSection}>
          <GoldRule color={colors.accent} />
          <Text style={[styles.tagline, { color: colors.text }]}>
            {t('about.tagline')}
          </Text>
          <GoldRule color={colors.accent} />
        </View>

        {/* Sections */}
        <View style={styles.sections}>

          {/* 01 — About the Masjid */}
          <View style={[styles.section, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
            <View style={styles.sectionHeader}>
              <SectionNumber n="01" color={colors.accent} />
              <Text style={[typography.title3, { color: colors.text, flex: 1 }]}>
                {t('about.aboutMasjidTitle')}
              </Text>
            </View>
            <View style={[styles.sectionDivider, { backgroundColor: colors.separator }]} />
            <Text style={[typography.callout, styles.sectionBody, { color: colors.textSecondary }]}>
              {t('about.aboutMasjid')}
            </Text>
          </View>

          {/* 02 — About the App */}
          <View style={[styles.section, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
            <View style={styles.sectionHeader}>
              <SectionNumber n="02" color={colors.accent} />
              <Text style={[typography.title3, { color: colors.text, flex: 1 }]}>
                {t('about.aboutAppTitle')}
              </Text>
            </View>
            <View style={[styles.sectionDivider, { backgroundColor: colors.separator }]} />
            <Text style={[typography.callout, styles.sectionBody, { color: colors.textSecondary }]}>
              {t('about.aboutApp')}
            </Text>
          </View>

          {/* 03 — Acknowledgements */}
          <View style={[styles.section, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
            <View style={styles.sectionHeader}>
              <SectionNumber n="03" color={colors.accent} />
              <Text style={[typography.title3, { color: colors.text, flex: 1 }]}>
                {t('about.creditsTitle')}
              </Text>
            </View>
            <View style={[styles.sectionDivider, { backgroundColor: colors.separator }]} />
            <Text style={[typography.callout, styles.sectionBody, { color: colors.textSecondary }]}>
              {t('about.credits')}
            </Text>
          </View>
        </View>

        {/* Footer dua */}
        <View style={styles.footerSection}>
          <Ionicons name="heart" size={14} color={colors.accent} style={{ marginBottom: spacing.sm }} />
          <Text style={[styles.footer, { color: colors.textTertiary }]}>
            {t('about.footer')}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing['5xl'],
  },
  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.xl,
  },
  logo: {
    width: 220,
    height: 220 * 0.28,
  },
  versionPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  // Tagline
  taglineSection: {
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  tagline: {
    fontSize: typography.title3.fontSize,
    fontWeight: fontWeight.light,
    fontStyle: 'italic',
    lineHeight: 28,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  // Gold rule
  ruleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
  },
  ruleLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  ruleDiamond: {
    width: 5,
    height: 5,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: spacing.sm,
  },
  // Sections
  sections: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  section: {
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionNumber: {
    fontSize: typography.footnote.fontSize,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.5,
    fontFamily: 'SpaceMono',
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },
  sectionBody: {
    lineHeight: 24,
  },
  // Footer
  footerSection: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing['4xl'],
  },
  footer: {
    fontSize: typography.footnote.fontSize,
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },
});
