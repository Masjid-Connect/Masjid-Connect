import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { getColors } from '@/constants/Colors';
import { spacing, borderRadius, typography, fonts } from '@/constants/Theme';

interface TextInputProps extends RNTextInputProps {
  label: string;
  error?: string;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  ({ label, error, secureTextEntry, style, ...props }, ref) => {
    const colorScheme = useColorScheme();
    const colors = getColors(colorScheme);
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const borderColor = error
      ? colors.urgent
      : focused
        ? colors.tint
        : colors.cardBorder;

    return (
      <View style={styles.wrapper}>
        <Text
          style={[
            typography.caption,
            {
              color: error ? colors.urgent : colors.textSecondary,
              marginBottom: spacing.xs,
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
            placeholderTextColor={colors.textSecondary}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            secureTextEntry={secureTextEntry && !showPassword}
            autoCapitalize="none"
            accessibilityLabel={label}
            accessibilityHint={error ? error : undefined}
            {...props}
          />
          {secureTextEntry && (
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <Text style={[typography.caption, { color: colors.urgent, marginTop: spacing.xs }]}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.callout.fontSize,
    lineHeight: typography.callout.lineHeight,
    paddingVertical: spacing.md,
  },
  eyeButton: {
    paddingLeft: spacing.sm,
  },
});
