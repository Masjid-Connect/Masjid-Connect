import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  View,
  Text,
  Pressable,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography, fonts, layout, timing } from '@/constants/Theme';

interface TextInputProps extends RNTextInputProps {
  label: string;
  error?: string;
  /** Helper text shown below the input (hidden when error is present) */
  helperText?: string;
  /** Maximum character count — displays counter below input */
  maxCharCount?: number;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  ({ label, error, helperText, maxCharCount, secureTextEntry, style, ...props }, ref) => {
    const { effectiveScheme } = useTheme();
    const colors = getColors(effectiveScheme);
    const { t } = useTranslation();
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Animated border color
    const borderProgress = useSharedValue(0); // 0 = default, 1 = focused, 2 = error

    const updateBorder = useCallback(
      (isFocused: boolean, hasError: boolean) => {
        if (hasError) {
          borderProgress.value = withTiming(2, { duration: timing.fast });
        } else if (isFocused) {
          borderProgress.value = withTiming(1, { duration: timing.fast });
        } else {
          borderProgress.value = withTiming(0, { duration: timing.fast });
        }
      },
      [borderProgress],
    );

    const handleFocus = useCallback(() => {
      setFocused(true);
      updateBorder(true, !!error);
    }, [error, updateBorder]);

    const handleBlur = useCallback(() => {
      setFocused(false);
      updateBorder(false, !!error);
    }, [error, updateBorder]);

    // Update border when error changes
    React.useEffect(() => {
      updateBorder(focused, !!error);
    }, [error, focused, updateBorder]);

    const borderColor = error
      ? colors.urgent
      : focused
        ? colors.tint
        : colors.cardBorder;

    const togglePassword = useCallback(() => {
      setShowPassword((prev) => !prev);
    }, []);

    return (
      <View style={styles.wrapper}>
        <Text
          style={[
            typography.caption1,
            {
              color: error ? colors.urgent : colors.textSecondary,
              marginBottom: spacing.xs,
              fontWeight: '500',
            },
          ]}>
          {label}
        </Text>
        <View style={[styles.inputContainer, { borderColor, backgroundColor: colors.card }]}>
          <RNTextInput
            ref={ref}
            style={[
              styles.input,
              {
                color: colors.text,
                fontFamily: fonts.body,
              },
              style,
            ]}
            placeholderTextColor={colors.textTertiary}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={secureTextEntry && !showPassword}
            autoCapitalize="none"
            accessibilityLabel={label}
            accessibilityHint={error || undefined}
            {...props}
          />
          {secureTextEntry && (
            <Pressable
              onPress={togglePassword}
              style={styles.eyeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? t('common.hidePassword') : t('common.showPassword')}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
        {error && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.errorRow}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Ionicons name="alert-circle" size={14} color={colors.urgent} />
            <Text style={[typography.caption1, { color: colors.urgent, marginStart: spacing.xs, flex: 1 }]}>
              {error}
            </Text>
          </Animated.View>
        )}
        {/* Helper text + character count row */}
        {((!error && helperText) || maxCharCount !== undefined) && (
          <View style={styles.metaRow}>
            {!error && helperText ? (
              <Text style={[typography.caption1, { color: colors.textTertiary, flex: 1 }]}>
                {helperText}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {maxCharCount !== undefined && (
              <Text
                style={[
                  typography.caption1,
                  {
                    color: (props.value?.length ?? 0) > maxCharCount
                      ? colors.urgent
                      : colors.textTertiary,
                  },
                ]}
              >
                {props.value?.length ?? 0}/{maxCharCount}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  input: {
    flex: 1,
    fontSize: typography.callout.fontSize,
    lineHeight: typography.callout.lineHeight,
    paddingVertical: spacing.md,
  },
  eyeButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
