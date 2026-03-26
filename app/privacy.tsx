import React from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation, fontWeight } from '@/constants/Theme';

interface PolicySectionProps {
  number: string;
  title: string;
  body: string;
  accentColor: string;
  textColor: string;
  bodyColor: string;
  dividerColor: string;
  isLast?: boolean;
}

const PolicySection = ({
  number,
  title,
  body,
  accentColor,
  textColor,
  bodyColor,
  dividerColor,
  isLast,
}: PolicySectionProps) => (
  <View style={styles.policySection}>
    <View style={styles.sectionRow}>
      <View style={styles.numberColumn}>
        <Text style={[styles.sectionNumber, { color: accentColor }]}>{number}</Text>
      </View>
      <View style={styles.sectionContent}>
        <Text style={[typography.headline, { color: textColor, marginBottom: spacing.sm }]}>
          {title}
        </Text>
        <Text style={[typography.callout, { color: bodyColor, lineHeight: 24 }]}>
          {body}
        </Text>
      </View>
    </View>
    {!isLast && <View style={[styles.sectionSeparator, { backgroundColor: dividerColor }]} />}
  </View>
);

export default function PrivacyPolicyScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();

  const sections = [
    { key: 'dataCollection', titleKey: 'privacy.dataCollectionTitle', bodyKey: 'privacy.dataCollection' },
    { key: 'howWeUse', titleKey: 'privacy.howWeUseTitle', bodyKey: 'privacy.howWeUse' },
    { key: 'dataStorage', titleKey: 'privacy.dataStorageTitle', bodyKey: 'privacy.dataStorage' },
    { key: 'thirdParty', titleKey: 'privacy.thirdPartyTitle', bodyKey: 'privacy.thirdParty' },
    { key: 'notifications', titleKey: 'privacy.notificationsTitle', bodyKey: 'privacy.notifications' },
    { key: 'yourRights', titleKey: 'privacy.yourRightsTitle', bodyKey: 'privacy.yourRights' },
    { key: 'children', titleKey: 'privacy.childrenTitle', bodyKey: 'privacy.children' },
    { key: 'changes', titleKey: 'privacy.changesTitle', bodyKey: 'privacy.changes' },
    { key: 'contact', titleKey: 'privacy.contactTitle', bodyKey: 'privacy.contact' },
  ] as const;

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
        {/* Hero header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={[styles.headerLabel, { color: colors.accent }]}>
            {t('privacy.lastUpdated').toUpperCase()}
          </Text>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('privacy.title')}
          </Text>
          <View style={[styles.goldRule, { backgroundColor: colors.accent }]} />
        </Animated.View>

        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={[typography.callout, styles.introText, { color: colors.textSecondary }]}>
            {t('privacy.intro')}
          </Text>
        </View>

        {/* Policy sections in a single card */}
        <Animated.View entering={FadeInDown.delay(0).duration(300).springify()} style={[styles.sectionsCard, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
          {sections.map((section, index) => (
            <PolicySection
              key={section.key}
              number={String(index + 1).padStart(2, '0')}
              title={t(section.titleKey)}
              body={t(section.bodyKey)}
              accentColor={colors.accent}
              textColor={colors.text}
              bodyColor={colors.textSecondary}
              dividerColor={colors.separator}
              isLast={index === sections.length - 1}
            />
          ))}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color={colors.accent} style={{ marginBottom: spacing.sm }} />
          <Text style={[typography.caption1, styles.footerText, { color: colors.textTertiary }]}>
            {t('about.appName')}
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
  // Header
  header: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerLabel: {
    fontSize: typography.caption2.fontSize,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  goldRule: {
    height: 2,
    width: 40,
    marginTop: spacing.lg,
    borderRadius: borderRadius['2xs'],
  },
  // Intro
  introSection: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['2xl'],
  },
  introText: {
    lineHeight: 24,
  },
  // Sections card
  sectionsCard: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  policySection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  sectionRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  numberColumn: {
    width: 28,
    paddingTop: 2,
  },
  sectionNumber: {
    fontSize: typography.footnote.fontSize,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  sectionContent: {
    flex: 1,
  },
  sectionSeparator: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.xl,
    marginStart: 44,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing['3xl'],
  },
  footerText: {
    fontWeight: fontWeight.medium,
    letterSpacing: 0.5,
  },
});
