import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ConvergentArch } from '@/components/brand/ConvergentArch';
import { KozoPaperBackground } from '@/components/ui/KozoPaperBackground';
import { getColors, palette } from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useTheme } from '@/contexts/ThemeContext';

export default function AboutModal() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  return (
    <KozoPaperBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.markContainer}>
          <ConvergentArch
            size={120}
            strokeColor={colors.tint}
            nodeColor={palette.divineGold}
            nodeOpacity={1}
          />
        </View>

        <Text style={[typography.title1, styles.title, { color: colors.text }]}>
          Mosque Connect
        </Text>

        <Text style={[typography.body, styles.tagline, { color: colors.textSecondary }]}>
          Your community, connected
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <InfoRow label="Version" value="1.0.0" color={colors.text} />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <InfoRow label="Prayer Times" value="Aladhan API" color={colors.text} />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <InfoRow label="Offline Fallback" value="adhan-js" color={colors.text} />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <InfoRow label="Framework" value="React Native + Expo" color={colors.text} />
        </View>

        <Text style={[typography.caption, styles.footer, { color: colors.textSecondary }]}>
          Built with care for the Muslim community.{'\n'}
          Prayer time data provided by Aladhan API.
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
  markContainer: {
    marginBottom: spacing.lg,
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
