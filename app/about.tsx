import React from 'react';
import { StyleSheet, ScrollView, Text, View, Image } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation } from '@/constants/Theme';

export default function AboutScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: t('about.title'),
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.backgroundSecondary },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + Name */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/Masjid_Logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[typography.title2, { color: colors.text, marginTop: spacing.lg }]}>
            {t('about.appName')}
          </Text>
          <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {t('about.version')} 1.0.0
          </Text>
        </View>

        {/* Tagline */}
        <Text style={[typography.body, styles.tagline, { color: colors.textSecondary }]}>
          {t('about.tagline')}
        </Text>

        {/* About the Masjid */}
        <View style={[styles.card, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.sm }]}>
            {t('about.aboutMasjidTitle')}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>
            {t('about.aboutMasjid')}
          </Text>
        </View>

        {/* About the App */}
        <View style={[styles.card, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.sm }]}>
            {t('about.aboutAppTitle')}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>
            {t('about.aboutApp')}
          </Text>
        </View>

        {/* Credits */}
        <View style={[styles.card, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.sm }]}>
            {t('about.creditsTitle')}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>
            {t('about.credits')}
          </Text>
        </View>

        {/* Footer */}
        <Text style={[typography.footnote, styles.footer, { color: colors.textTertiary }]}>
          {t('about.footer')}
        </Text>
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
  header: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
  },
  tagline: {
    textAlign: 'center',
    paddingHorizontal: spacing['4xl'],
    marginBottom: spacing['2xl'],
  },
  card: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  footer: {
    textAlign: 'center',
    paddingHorizontal: spacing['3xl'],
    marginTop: spacing.lg,
  },
});
