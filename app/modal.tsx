import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { KozoPaperBackground } from '@/components/ui/KozoPaperBackground';
import { getColors } from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useTheme } from '@/contexts/ThemeContext';

export default function AboutModal() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();

  return (
    <KozoPaperBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/Masjid_Logo.png')}
            style={[styles.logo, effectiveScheme === 'dark' && { tintColor: colors.text }]}
            resizeMode="contain"
          />
        </View>

        <Text style={[typography.title1, styles.title, { color: colors.text }]}>
          The Salafi Masjid
        </Text>

        <Text style={[typography.body, styles.tagline, { color: colors.textSecondary }]}>
          {t('about.tagline')}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <InfoRow label={t('about.version')} value="1.0.0" color={colors.text} />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <InfoRow label={t('about.prayerTimes')} value="Aladhan API" color={colors.text} />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <InfoRow label={t('about.offlineFallback')} value="adhan-js" color={colors.text} />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <InfoRow label={t('about.framework')} value="React Native + Expo" color={colors.text} />
        </View>

        <Text style={[typography.caption, styles.footer, { color: colors.textSecondary }]}>
          {t('about.footer')}
        </Text>
      </ScrollView>
    </KozoPaperBackground>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.row}>
      <Text style={[typography.body, { color }]}>{label}</Text>
      <Text style={[typography.callout, { color, opacity: 0.7 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 280,
    height: 78,
  },
  title: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
});
