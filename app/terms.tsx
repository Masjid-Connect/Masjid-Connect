import React from 'react';
import { StyleSheet, ScrollView, Text, View, Pressable, Linking } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation, fontWeight, hairline } from '@/constants/Theme';

const CONTACT_EMAIL = 'support@salafimasjid.app';

interface TermsSectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
  accentColor: string;
  textColor: string;
  bodyColor: string;
  dividerColor: string;
  isLast?: boolean;
}

const TermsSection = ({
  number,
  title,
  children,
  accentColor,
  textColor,
  bodyColor,
  dividerColor,
  isLast,
}: TermsSectionProps) => (
  <View style={styles.policySection}>
    <View style={styles.sectionRow}>
      <View style={styles.numberColumn}>
        <Text style={[styles.sectionNumber, { color: accentColor }]}>{number}</Text>
      </View>
      <View style={styles.sectionContent}>
        <Text style={[typography.headline, { color: textColor, marginBottom: spacing.sm }]}>
          {title}
        </Text>
        <View>{children}</View>
      </View>
    </View>
    {!isLast && <View style={[styles.sectionSeparator, { backgroundColor: dividerColor }]} />}
  </View>
);

export default function TermsScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();

  const bodyStyle = [typography.callout, { color: colors.textSecondary, lineHeight: 24 }];
  const bulletStyle = [typography.callout, { color: colors.textSecondary, lineHeight: 24, paddingStart: spacing.lg }];

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
            {t('legal.lastUpdated').toUpperCase()}
          </Text>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('legal.termsOfService')}
          </Text>
          <View style={[styles.goldRule, { backgroundColor: colors.accent }]} />
        </Animated.View>

        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={[typography.callout, styles.introText, { color: colors.textSecondary }]}>
            Welcome to Mosque Connect. These Terms of Service govern your use of the Mosque Connect
            mobile application. By downloading, installing, or using the App, you agree to be bound
            by these Terms.
          </Text>
        </View>

        {/* Terms sections in a single card */}
        <Animated.View entering={FadeInDown.delay(0).duration(300).springify()} style={[styles.sectionsCard, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>

          <TermsSection
            number="01"
            title="Use of the App"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              Mosque Connect provides a community platform for local mosques, offering prayer time
              calculations, announcements, event listings, and community notifications. You may use the
              App for personal, non-commercial purposes in accordance with these Terms.
            </Text>
          </TermsSection>

          <TermsSection
            number="02"
            title="Account Registration"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              Some features require you to create an account. When you do, you agree to:
            </Text>
            <Text style={bulletStyle}>
              {'\u2022 Provide accurate and complete information\n'}
              {'\u2022 Maintain and update your information as needed\n'}
              {'\u2022 Keep your account credentials secure\n'}
              {'\u2022 Accept responsibility for all activity under your account\n'}
              {'\u2022 Notify us immediately of any unauthorized use'}
            </Text>
            <Text style={bodyStyle}>
              You may also use the App in a limited capacity as a guest without creating an account.
            </Text>
          </TermsSection>

          <TermsSection
            number="03"
            title="Prayer Times"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              Prayer times are calculated using the Aladhan API and, when offline, the adhan-js library.
              While we strive for accuracy, prayer times are provided as a convenience and should not be
              considered a definitive religious ruling. We recommend consulting your local mosque or
              scholar for confirmation.
            </Text>
          </TermsSection>

          <TermsSection
            number="04"
            title="User Conduct"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>You agree not to:</Text>
            <Text style={bulletStyle}>
              {'\u2022 Use the App for any unlawful purpose\n'}
              {'\u2022 Attempt to gain unauthorized access to the App or its systems\n'}
              {'\u2022 Interfere with or disrupt the App\u2019s functionality\n'}
              {'\u2022 Upload or transmit malicious code or content\n'}
              {'\u2022 Impersonate any person or entity\n'}
              {'\u2022 Scrape, harvest, or collect data without permission\n'}
              {'\u2022 Use the App to send spam or unsolicited communications'}
            </Text>
          </TermsSection>

          <TermsSection
            number="05"
            title="Mosque Content"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              Mosques are responsible for the accuracy and appropriateness of their announcements,
              events, and other content. We do not endorse or guarantee the accuracy of mosque-published
              content. If you believe any content is inappropriate, please report it to us.
            </Text>
          </TermsSection>

          <TermsSection
            number="06"
            title="Intellectual Property"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              The App and its original content, features, and functionality are owned by Mosque Connect
              and are protected by international copyright, trademark, and other intellectual property
              laws. You may not copy, modify, distribute, or create derivative works without our express
              written consent.
            </Text>
          </TermsSection>

          <TermsSection
            number="07"
            title="Third-Party Services"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              The App integrates with third-party services including the Aladhan API, Apple and Google
              for authentication, and the Expo Push Notification Service. Your use of these services is
              subject to their respective terms and privacy policies.
            </Text>
          </TermsSection>

          <TermsSection
            number="08"
            title="Notifications"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              By enabling push notifications, you consent to receiving prayer reminders, mosque
              announcements, and event notifications. You can customise which notifications you receive
              through the App settings or your device settings.
            </Text>
          </TermsSection>

          <TermsSection
            number="09"
            title="Disclaimer of Warranties"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              The App is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties
              of any kind, either express or implied. We do not warrant that the App will be
              uninterrupted, error-free, or secure. Prayer times are provided for informational purposes
              only.
            </Text>
          </TermsSection>

          <TermsSection
            number="10"
            title="Limitation of Liability"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              To the maximum extent permitted by law, Mosque Connect shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising out of your use
              of the App. Our total liability shall not exceed the amount you paid us in the twelve
              months preceding the claim, or £50, whichever is greater.
            </Text>
          </TermsSection>

          <TermsSection
            number="11"
            title="Account Termination"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              You may delete your account at any time through the App settings. Upon deletion, all your
              personal data, subscriptions, and notification preferences will be permanently removed. We
              reserve the right to suspend or terminate accounts that violate these Terms.
            </Text>
          </TermsSection>

          <TermsSection
            number="12"
            title="Changes to Terms"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              We may update these Terms from time to time. We will notify you of significant changes by
              posting the updated Terms within the App. Continued use after changes are posted
              constitutes acceptance of the revised Terms.
            </Text>
          </TermsSection>

          <TermsSection
            number="13"
            title="Governing Law"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
          >
            <Text style={bodyStyle}>
              These Terms are governed by and construed in accordance with the laws of England and Wales.
              Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of
              the courts of England and Wales.
            </Text>
          </TermsSection>

          <TermsSection
            number="14"
            title="Contact Us"
            accentColor={colors.accent}
            textColor={colors.text}
            bodyColor={colors.textSecondary}
            dividerColor={colors.separator}
            isLast
          >
            <Text style={bodyStyle}>
              If you have questions or concerns about these Terms, please contact us at:
            </Text>
            <Pressable
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
              accessibilityRole="link"
              accessibilityLabel={t('a11y.emailContact', { email: CONTACT_EMAIL })}
            >
              <Text style={[typography.callout, styles.link, { color: colors.tint }]}>
                {CONTACT_EMAIL}
              </Text>
            </Pressable>
          </TermsSection>

        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="document-text" size={16} color={colors.accent} style={{ marginBottom: spacing.sm }} />
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
    paddingBottom: spacing.xl,
  },
  sectionSeparator: {
    height: hairline,
    marginStart: 44,
  },
  link: {
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
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
