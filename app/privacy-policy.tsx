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

export default function PrivacyPolicyScreen() {
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
          title: t('legal.privacyPolicy'),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.tint,
          headerTitleStyle: { color: colors.text },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>{t('legal.privacyPolicy')}</Text>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
          {t('legal.lastUpdated', { date: LAST_UPDATED })}
        </Text>

        <Text style={bodyStyle}>
          Mosque Connect ("we," "our," or "us") operates the Mosque Connect mobile application
          (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard
          your information when you use our App. Please read this policy carefully. By using the
          App, you agree to the collection and use of information in accordance with this policy.
        </Text>

        {/* Information We Collect */}
        <Text style={headingStyle}>1. Information We Collect</Text>

        <Text style={[styles.subheading, { color: colors.text }]}>Account Information</Text>
        <Text style={bulletStyle}>
          {'\u2022'} Email address (required for account creation){'\n'}
          {'\u2022'} Full name (optional, provided during registration){'\n'}
          {'\u2022'} Authentication tokens for session management
        </Text>

        <Text style={[styles.subheading, { color: colors.text }]}>Location Data</Text>
        <Text style={bodyStyle}>
          With your explicit permission, we collect your device's approximate location to:
        </Text>
        <Text style={bulletStyle}>
          {'\u2022'} Calculate accurate prayer times for your area{'\n'}
          {'\u2022'} Find nearby mosques{'\n'}
          {'\u2022'} Determine your local timezone for prayer time display
        </Text>
        <Text style={bodyStyle}>
          Location data is stored locally on your device and on our servers only as latitude/longitude
          coordinates associated with your account. You can revoke location access at any time through
          your device settings.
        </Text>

        <Text style={[styles.subheading, { color: colors.text }]}>Push Notification Tokens</Text>
        <Text style={bodyStyle}>
          If you enable push notifications, we store your device's push notification token to send you
          prayer reminders, mosque announcements, and event notifications. You can disable notifications
          at any time through your device settings or in the App.
        </Text>

        <Text style={[styles.subheading, { color: colors.text }]}>Usage Data</Text>
        <Text style={bodyStyle}>
          We collect anonymized usage data such as app interactions, crash reports, and performance
          metrics to improve the App experience. This data does not personally identify you.
        </Text>

        {/* How We Use Your Information */}
        <Text style={headingStyle}>2. How We Use Your Information</Text>
        <Text style={bodyStyle}>We use the information we collect to:</Text>
        <Text style={bulletStyle}>
          {'\u2022'} Provide and maintain the App{'\n'}
          {'\u2022'} Calculate and display prayer times based on your location{'\n'}
          {'\u2022'} Send push notifications for prayer reminders, announcements, and events{'\n'}
          {'\u2022'} Show nearby mosques and allow mosque subscriptions{'\n'}
          {'\u2022'} Authenticate your account and maintain your session{'\n'}
          {'\u2022'} Improve and optimize the App experience
        </Text>

        {/* Data Storage */}
        <Text style={headingStyle}>3. Data Storage and Security</Text>
        <Text style={bodyStyle}>
          Your account data is stored on our servers hosted on Digital Ocean infrastructure.
          Authentication tokens are stored securely on your device using platform-native secure
          storage (Keychain on iOS, EncryptedSharedPreferences on Android). We implement
          industry-standard security measures including encrypted data transmission (HTTPS/TLS),
          secure token-based authentication, and regular security updates.
        </Text>

        {/* Third-Party Services */}
        <Text style={headingStyle}>4. Third-Party Services</Text>
        <Text style={bodyStyle}>
          The App integrates with the following third-party services:
        </Text>
        <Text style={bulletStyle}>
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Aladhan API</Text> — Provides prayer time
          calculations. Your latitude and longitude are sent to this service to compute prayer times.
          No personal information is shared. See: aladhan.com/privacy{'\n'}
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Apple Sign In / Google Sign In</Text> — If
          you choose to authenticate with Apple or Google, their respective privacy policies apply to
          the authentication process{'\n'}
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Expo Push Notification Service</Text> —
          Delivers push notifications to your device. Your push token (not personal data) is shared
          with Expo's servers to facilitate notification delivery
        </Text>

        {/* Data Sharing */}
        <Text style={headingStyle}>5. Data Sharing</Text>
        <Text style={bodyStyle}>
          We do not sell, trade, or rent your personal information to third parties. We may share
          your information only in the following circumstances:
        </Text>
        <Text style={bulletStyle}>
          {'\u2022'} With your consent{'\n'}
          {'\u2022'} To comply with legal obligations{'\n'}
          {'\u2022'} To protect our rights, privacy, safety, or property{'\n'}
          {'\u2022'} In connection with a merger, acquisition, or sale of assets (you would be notified)
        </Text>

        {/* Your Rights */}
        <Text style={headingStyle}>6. Your Rights</Text>
        <Text style={bodyStyle}>You have the right to:</Text>
        <Text style={bulletStyle}>
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Access</Text> — Request a copy of your
          personal data{'\n'}
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Correction</Text> — Update or correct
          inaccurate information{'\n'}
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Deletion</Text> — Delete your account and
          all associated data permanently through the App settings or by contacting us{'\n'}
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Data Export</Text> — Request a machine-readable
          export of your data{'\n'}
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Withdraw Consent</Text> — Revoke permissions
          for location access or push notifications at any time{'\n'}
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Opt Out</Text> — Unsubscribe from mosques or
          disable specific notification categories
        </Text>
        <Text style={bodyStyle}>
          To exercise any of these rights, use the in-app settings or contact us at{' '}
          {CONTACT_EMAIL}.
        </Text>

        {/* GDPR */}
        <Text style={headingStyle}>7. GDPR Compliance (European Users)</Text>
        <Text style={bodyStyle}>
          If you are located in the European Economic Area (EEA), you have additional rights under
          the General Data Protection Regulation (GDPR). Our lawful basis for processing your data is:
        </Text>
        <Text style={bulletStyle}>
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Consent</Text> — For location data and push
          notifications{'\n'}
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Contractual necessity</Text> — For account
          creation and app functionality{'\n'}
          {'\u2022'} <Text style={{ fontWeight: '600' }}>Legitimate interest</Text> — For service
          improvement and security
        </Text>
        <Text style={bodyStyle}>
          You may lodge a complaint with your local data protection authority if you believe we have
          not handled your data appropriately.
        </Text>

        {/* CCPA */}
        <Text style={headingStyle}>8. CCPA Compliance (California Users)</Text>
        <Text style={bodyStyle}>
          If you are a California resident, you have the right under the California Consumer Privacy
          Act (CCPA) to:
        </Text>
        <Text style={bulletStyle}>
          {'\u2022'} Know what personal information is collected about you{'\n'}
          {'\u2022'} Know whether your personal information is sold or disclosed{'\n'}
          {'\u2022'} Say no to the sale of personal information (we do not sell your data){'\n'}
          {'\u2022'} Request deletion of your personal information{'\n'}
          {'\u2022'} Not be discriminated against for exercising your CCPA rights
        </Text>

        {/* Children */}
        <Text style={headingStyle}>9. Children's Privacy</Text>
        <Text style={bodyStyle}>
          The App is not directed at children under the age of 13. We do not knowingly collect
          personal information from children under 13. If we become aware that we have collected
          data from a child under 13, we will take steps to delete that information promptly.
        </Text>

        {/* Changes */}
        <Text style={headingStyle}>10. Changes to This Policy</Text>
        <Text style={bodyStyle}>
          We may update this Privacy Policy from time to time. We will notify you of any changes
          by posting the new Privacy Policy within the App and updating the "Last Updated" date.
          Your continued use of the App after changes are posted constitutes your acceptance of
          the revised policy.
        </Text>

        {/* Contact */}
        <Text style={headingStyle}>11. Contact Us</Text>
        <Text style={bodyStyle}>
          If you have questions or concerns about this Privacy Policy, please contact us at:
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
  subheading: {
    ...typography.headline,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
