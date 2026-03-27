import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, springs, components, hairline } from '@/constants/Theme';
import { layout } from '@/lib/layoutGrid';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export type RowPosition = 'first' | 'middle' | 'last' | 'only';

interface SettingsRowProps {
  icon?: {
    name: IoniconsName;
    backgroundColor: string;
  };
  label: string;
  value?: string;
  accessory?: 'disclosure' | 'toggle' | 'none';
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  position?: RowPosition;
}

const ICON_BOX_SIZE = components.iconBox.size;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SettingsRow = ({
  icon,
  label,
  value,
  accessory = 'none',
  toggleValue,
  onToggleChange,
  onPress,
  destructive = false,
  position = 'middle',
}: SettingsRowProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (onPress) {
      scale.value = withSpring(0.98, springs.snappy);
    }
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springs.gentle);
  }, [scale]);

  const handleToggle = useCallback(
    (val: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggleChange?.(val);
    },
    [onToggleChange]
  );

  const showSeparator = position === 'first' || position === 'middle';
  const labelColor = destructive ? colors.urgent : colors.text;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress && accessory !== 'toggle'}
      style={[styles.row, animatedStyle]}
      accessibilityRole={accessory === 'toggle' ? 'switch' : onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityState={accessory === 'toggle' ? { checked: toggleValue } : undefined}
    >
      {icon && (
        <View style={[styles.iconBox, { backgroundColor: icon.backgroundColor }]}>
          <Ionicons name={icon.name} size={17} color={palette.white} />
        </View>
      )}

      <View style={[styles.content, showSeparator && styles.separator, showSeparator && { borderBottomColor: colors.separator }]}>
        <Text style={[typography.body, { color: labelColor, flex: 1 }]} numberOfLines={1}>
          {label}
        </Text>

        {accessory === 'toggle' && (
          <Switch
            value={toggleValue}
            onValueChange={handleToggle}
            trackColor={{ false: colors.separator, true: colors.tint }}
            thumbColor={palette.white}
          />
        )}

        {accessory === 'disclosure' && (
          <View style={styles.disclosureContent}>
            {value ? (
              <Text style={[typography.body, { color: colors.textSecondary, marginEnd: spacing.xs }]} numberOfLines={1}>
                {value}
              </Text>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        )}

        {accessory === 'none' && value ? (
          <Text style={[typography.body, { color: colors.textSecondary }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: spacing.lg,
    minHeight: layout.minTouchTarget,
  },
  iconBox: {
    width: ICON_BOX_SIZE,
    height: ICON_BOX_SIZE,
    borderRadius: borderRadius.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingEnd: spacing.lg,
  },
  separator: {
    borderBottomWidth: hairline,
  },
  disclosureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '50%',
  },
});
