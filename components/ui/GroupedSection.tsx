/**
 * GroupedSection — Apple HIG grouped list section.
 *
 * Extracts the SettingsSection pattern into a general-purpose component
 * for use across announcements, events, and any sectioned content.
 *
 * Card with borderRadius + elevation, optional section header/footer,
 * and consistent spacing matching the Settings screen pattern.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, getElevation, typography } from '@/constants/Theme';

interface GroupedSectionProps {
  header?: string;
  footer?: string;
  children: React.ReactNode;
}

export const GroupedSection = ({ header, footer, children }: GroupedSectionProps) => {
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
    marginTop: spacing.xl,
  },
  header: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  footer: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});
