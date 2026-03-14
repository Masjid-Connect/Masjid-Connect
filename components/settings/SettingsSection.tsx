import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, getElevation, typography } from '@/constants/Theme';
import { layout } from '@/lib/layoutGrid';

interface SettingsSectionProps {
  header?: string;
  footer?: string;
  children: React.ReactNode;
}

export const SettingsSection = ({ header, footer, children }: SettingsSectionProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  return (
    <View style={styles.wrapper}>
      {header && (
        <Text
          style={[typography.sectionHeader, styles.header, { color: colors.textSecondary }]}
          accessibilityRole="header"
        >
          {header}
        </Text>
      )}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            ...getElevation('sm', isDark),
          },
        ]}
      >
        {children}
      </View>
      {footer && (
        <Text style={[typography.footnote, styles.footer, { color: colors.textSecondary }]}>
          {footer}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing['2xl'],
  },
  header: {
    marginBottom: spacing.sm,
    // Align with row text: card margin (screenInset) + row paddingLeft (lg)
    paddingHorizontal: layout.screenInset + spacing.lg,
  },
  card: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  footer: {
    marginTop: spacing.sm,
    paddingHorizontal: layout.screenInset + spacing.lg,
    lineHeight: 18,
  },
});
