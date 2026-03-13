import React from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';

export default function PrivacyPolicyScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();

  const sectionStyle = [typography.headline, { color: colors.text, marginTop: spacing['2xl'], marginBottom: spacing.sm }];
  const bodyStyle = [typography.body, { color: colors.textSecondary, lineHeight: 24 }];

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: t('privacy.title'),
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.backgroundSecondary },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.caption1, { color: colors.textTertiary, marginBottom: spacing.lg }]}>
          {t('privacy.lastUpdated')}
        </Text>

        <Text style={bodyStyle}>
          {t('privacy.intro')}
        </Text>

        <Text style={sectionStyle}>{t('privacy.dataCollectionTitle')}</Text>
        <Text style={bodyStyle}>{t('privacy.dataCollection')}</Text>

        <Text style={sectionStyle}>{t('privacy.howWeUseTitle')}</Text>
        <Text style={bodyStyle}>{t('privacy.howWeUse')}</Text>

        <Text style={sectionStyle}>{t('privacy.dataStorageTitle')}</Text>
        <Text style={bodyStyle}>{t('privacy.dataStorage')}</Text>

        <Text style={sectionStyle}>{t('privacy.thirdPartyTitle')}</Text>
        <Text style={bodyStyle}>{t('privacy.thirdParty')}</Text>

        <Text style={sectionStyle}>{t('privacy.notificationsTitle')}</Text>
        <Text style={bodyStyle}>{t('privacy.notifications')}</Text>

        <Text style={sectionStyle}>{t('privacy.yourRightsTitle')}</Text>
        <Text style={bodyStyle}>{t('privacy.yourRights')}</Text>

        <Text style={sectionStyle}>{t('privacy.childrenTitle')}</Text>
        <Text style={bodyStyle}>{t('privacy.children')}</Text>

        <Text style={sectionStyle}>{t('privacy.changesTitle')}</Text>
        <Text style={bodyStyle}>{t('privacy.changes')}</Text>

        <Text style={sectionStyle}>{t('privacy.contactTitle')}</Text>
        <Text style={bodyStyle}>{t('privacy.contact')}</Text>

        <View style={styles.spacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['5xl'],
  },
  spacer: {
    height: spacing['4xl'],
  },
});
