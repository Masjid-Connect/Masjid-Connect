import React from 'react';
import { StyleSheet, ScrollView, Text, View, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/Theme';

const CONTACT_EMAIL = 'support@salafimasjid.app';
const LAST_UPDATED = 'March 2026';

export default function TermsScreen() {
  const router = useRouter();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();

  const headingStyle = [styles.heading, { color: colors.text }];
  const bodyStyle = [styles.bodyText, { color: colors.text }];
  const bulletStyle = [styles.bullet, { color: colors.text }];

  return (
    <>
      <Stack.Screen
        options={{
          title: t('legal.termsOfService'),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.tint,
          headerTitleStyle: { color: colors.text },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>{t('legal.termsOfService')}</Text>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
          {t('legal.lastUpdated', { date: LAST_UPDATED })}
        </Text>

        <Text style={bodyStyle}>
          Welcome to Mosque Connect. These Terms of Service ("Terms") govern your use of the
          Mosque Connect mobile application (the "App") operated by Mosque Connect ("we," "our,"
          or "us"). By downloading, installing, or using the App, you agree to be bound by these
          Terms. If you do not agree to these Terms, do not use the App.
        </Text>

        {/* Use of the App */}
        <Text style={headingStyle}>1. Use of the App</Text>
        <Text style={bodyStyle}>
          Mosque Connect provides a community platform for local mosques, offering prayer time
          calculations, announcements, event listings, and community notifications. You may use the
          App for personal, non-commercial purposes in accordance with these Terms.
        </Text>

        {/* Account Registration */}
        <Text style={headingStyle}>2. Account Registration</Text>
        <Text style={bodyStyle}>
          Some features of the App require you to create an account. When you create an account,
          you agree to:
        </Text>
        <Text style={bulletStyle}>
          {'\u2022'} Provide accurate and complete information{'\n'}
          {'\u2022'} Maintain and update your information as needed{'\n'}
          {'\u2022'} Keep your account credentials secure{'\n'}
          {'\u2022'} Accept responsibility for all activity under your account{'\n'}
          {'\u2022'} Notify us immediately of any unauthorized use
        </Text>
        <Text style={bodyStyle}>
          You may also use the App in a limited capacity as a guest without creating an account.
          Guest users will not have access to push notifications or cross-device syncing.
        </Text>

        {/* Prayer Times */}
        <Text style={headingStyle}>3. Prayer Times</Text>
        <Text style={bodyStyle}>
          Prayer times displayed in the App are calculated using the Aladhan API and, when offline,
          the adhan-js library. While we strive for accuracy, prayer times are provided as a
          convenience and should not be considered a definitive religious ruling. We recommend
          consulting your local mosque or scholar for confirmation of prayer times, especially
          during edge cases such as high-latitude locations.
        </Text>

        {/* User Conduct */}
        <Text style={headingStyle}>4. User Conduct</Text>
        <Text style={bodyStyle}>You agree not to:</Text>
        <Text style={bulletStyle}>
          {'\u2022'} Use the App for any unlawful purpose{'\n'}
          {'\u2022'} Attempt to gain unauthorized access to the App or its systems{'\n'}
          {'\u2022'} Interfere with or disrupt the App's functionality{'\n'}
          {'\u2022'} Upload or transmit malicious code or content{'\n'}
          {'\u2022'} Impersonate any person or entity{'\n'}
          {'\u2022'} Scrape, harvest, or collect data from the App without permission{'\n'}
          {'\u2022'} Use the App to send spam or unsolicited communications
        </Text>

        {/* Mosque Content */}
        <Text style={headingStyle}>5. Mosque Content</Text>
        <Text style={bodyStyle}>
          Mosques are responsible for the accuracy and appropriateness of their announcements,
          events, and other content posted through the App. We do not endorse or guarantee the
          accuracy of mosque-published content. If you believe any content is inappropriate or
          inaccurate, please report it to us at {CONTACT_EMAIL}.
        </Text>

        {/* Intellectual Property */}
        <Text style={headingStyle}>6. Intellectual Property</Text>
        <Text style={bodyStyle}>
          The App and its original content, features, and functionality are owned by Mosque Connect
          and are protected by international copyright, trademark, and other intellectual property
          laws. The Convergent Arch brand mark, design system, and all visual assets are proprietary.
          You may not copy, modify, distribute, or create derivative works from any part of the App
          without our express written consent.
        </Text>

        {/* Third-Party Services */}
        <Text style={headingStyle}>7. Third-Party Services</Text>
        <Text style={bodyStyle}>
          The App integrates with third-party services including the Aladhan API for prayer times,
          Apple and Google for authentication, and the Expo Push Notification Service. Your use of
          these services is subject to their respective terms and privacy policies. We are not
          responsible for the practices or content of third-party services.
        </Text>

        {/* Notifications */}
        <Text style={headingStyle}>8. Notifications</Text>
        <Text style={bodyStyle}>
          By enabling push notifications, you consent to receiving prayer reminders, mosque
          announcements, and event notifications. You can customize which notifications you
          receive through the App settings or your device settings. We will not send marketing
          or promotional notifications without your explicit consent.
        </Text>

        {/* Disclaimer of Warranties */}
        <Text style={headingStyle}>9. Disclaimer of Warranties</Text>
        <Text style={bodyStyle}>
          THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
          EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP
          WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. PRAYER TIMES ARE PROVIDED FOR INFORMATIONAL
          PURPOSES ONLY.
        </Text>

        {/* Limitation of Liability */}
        <Text style={headingStyle}>10. Limitation of Liability</Text>
        <Text style={bodyStyle}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, MOSQUE CONNECT SHALL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
          LIMITED TO LOSS OF DATA, LOSS OF PROFITS, OR MISSED PRAYER TIMES, ARISING OUT OF YOUR
          USE OF THE APP. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE
          TWELVE MONTHS PRECEDING THE CLAIM, OR $50, WHICHEVER IS GREATER.
        </Text>

        {/* Account Termination */}
        <Text style={headingStyle}>11. Account Termination</Text>
        <Text style={bodyStyle}>
          You may delete your account at any time through the App settings. Upon deletion, all
          your personal data, subscriptions, and notification preferences will be permanently
          removed. We reserve the right to suspend or terminate accounts that violate these Terms.
        </Text>

        {/* Changes to Terms */}
        <Text style={headingStyle}>12. Changes to Terms</Text>
        <Text style={bodyStyle}>
          We may update these Terms from time to time. We will notify you of significant changes
          by posting the updated Terms within the App and updating the "Last Updated" date.
          Continued use of the App after changes are posted constitutes acceptance of the revised
          Terms.
        </Text>

        {/* Governing Law */}
        <Text style={headingStyle}>13. Governing Law</Text>
        <Text style={bodyStyle}>
          These Terms are governed by and construed in accordance with the laws of the United
          States, without regard to conflict of law principles. Any disputes arising from these
          Terms or the App shall be resolved through binding arbitration in accordance with
          applicable rules.
        </Text>

        {/* Contact */}
        <Text style={headingStyle}>14. Contact Us</Text>
        <Text style={bodyStyle}>
          If you have questions or concerns about these Terms, please contact us at:
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
          <Text style={[styles.link, { color: colors.tint }]}>{CONTACT_EMAIL}</Text>
        </TouchableOpacity>

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
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  title: {
    ...typography.title1,
    marginBottom: spacing.xs,
  },
  lastUpdated: {
    ...typography.footnote,
    marginBottom: spacing['2xl'],
  },
  heading: {
    ...typography.title3,
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
  },
  bodyText: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  bullet: {
    ...typography.body,
    marginBottom: spacing.md,
    paddingLeft: spacing.lg,
  },
  link: {
    ...typography.body,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  spacer: {
    height: spacing['3xl'],
  },
});
