import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography, getElevation } from '@/constants/Theme';
import { AmountSelector, BankDetailsSheet } from '@/components/support';
import { donations } from '@/lib/api';

// Fee calculation: blended 2.5% + 20p estimate
const FEE_PERCENT = 0.025;
const FEE_FIXED_PENCE = 20;

function calculateFee(amountPounds: number): number {
  const netPence = Math.round(amountPounds * 100);
  const grossPence = Math.ceil((netPence + FEE_FIXED_PENCE) / (1 - FEE_PERCENT));
  return (grossPence - netPence) / 100;
}

const HEADER_HEIGHT = 44;
const LARGE_TITLE_HEIGHT = 52;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

type Frequency = 'one-time' | 'monthly';

export default function SupportScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // State
  const [frequency, setFrequency] = useState<Frequency>('one-time');
  const [amount, setAmount] = useState<number | null>(25);
  const [isLoading, setIsLoading] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [giftAid, setGiftAid] = useState(false);
  const [coverFees, setCoverFees] = useState(false);

  const feeAmount = amount ? calculateFee(amount) : 0;

  // Large title collapse animation
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, LARGE_TITLE_HEIGHT], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, LARGE_TITLE_HEIGHT],
          [0, -LARGE_TITLE_HEIGHT / 2],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const inlineHeaderOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [LARGE_TITLE_HEIGHT - 10, LARGE_TITLE_HEIGHT], [0, 1], Extrapolation.CLAMP),
  }));

  const handleFrequency = useCallback((freq: Frequency) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFrequency(freq);
  }, []);

  const handleDonate = useCallback(async () => {
    if (!amount || amount < 1) {
      if (Platform.OS === 'web') {
        window.alert(t('support.minAmount'));
      } else {
        Alert.alert(t('support.error'), t('support.minAmount'));
      }
      return;
    }
    if (amount > 10000) {
      if (Platform.OS === 'web') {
        window.alert(t('support.maxAmount'));
      } else {
        Alert.alert(t('support.error'), t('support.maxAmount'));
      }
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const stripeUrl = await donations.createCheckoutUrl(
        amount * 100, // Convert pounds to pence
        'gbp',
        frequency,
        { giftAid, coverFees },
      );

      if (stripeUrl) {
        await WebBrowser.openBrowserAsync(stripeUrl, {
          dismissButtonStyle: 'close',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      }
    } catch {
      if (Platform.OS === 'web') {
        window.alert(t('support.errorMessage'));
      } else {
        Alert.alert(t('support.error'), t('support.errorMessage'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [amount, frequency, giftAid, coverFees, t]);

  const handleBankTransfer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowBankDetails(true);
  }, []);

  const buttonLabel = amount && amount >= 1
    ? t('support.donateButton', { amount: amount.toLocaleString() })
    : t('support.donateButtonDefault');

  return (
    <View style={[styles.root, { backgroundColor: colors.backgroundSecondary }]}>
      {/* Inline header */}
      <View style={[styles.inlineHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT, backgroundColor: colors.backgroundSecondary }]}>
        <Animated.Text
          style={[typography.headline, { color: colors.text, textAlign: 'center' }, inlineHeaderOpacity]}
        >
          {t('support.title')}
        </Animated.Text>
        <Animated.View
          style={[styles.headerSeparator, { backgroundColor: colors.separator }, inlineHeaderOpacity]}
        />
      </View>

      <AnimatedScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + HEADER_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {/* Large title */}
        <Animated.View style={[styles.largeTitleContainer, largeTitleStyle]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('support.title')}
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={[typography.body, styles.subtitle, { color: colors.textSecondary }]}>
            {t('support.subtitle')}
          </Text>
        </Animated.View>

        {/* Frequency toggle */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={[
            styles.frequencyContainer,
            {
              backgroundColor: colors.backgroundGrouped,
              borderRadius: borderRadius.sm,
            },
          ]}
        >
          {(['one-time', 'monthly'] as const).map((freq) => {
            const isActive = frequency === freq;
            return (
              <Pressable
                key={freq}
                style={[
                  styles.frequencyButton,
                  {
                    backgroundColor: isActive ? colors.card : 'transparent',
                    borderRadius: borderRadius.xs,
                    ...(isActive ? getElevation('sm', isDark) : {}),
                  },
                ]}
                onPress={() => handleFrequency(freq)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    typography.subhead,
                    {
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? colors.text : colors.textSecondary,
                    },
                  ]}
                >
                  {t(`support.${freq === 'one-time' ? 'oneTime' : 'monthly'}`)}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Amount selection */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <AmountSelector
            selectedAmount={amount}
            onAmountChange={setAmount}
          />
        </Animated.View>

        {/* Gift Aid */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: giftAid
                  ? (isDark ? 'rgba(45, 106, 79, 0.12)' : 'rgba(45, 106, 79, 0.06)')
                  : (isDark ? colors.backgroundGrouped : 'rgba(45, 106, 79, 0.03)'),
                borderColor: giftAid
                  ? palette.sage600
                  : (isDark ? 'rgba(45, 106, 79, 0.2)' : 'rgba(45, 106, 79, 0.12)'),
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGiftAid(!giftAid);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: giftAid }}
            accessibilityLabel={t('support.giftAid')}
          >
            <View
              style={[
                styles.optionCheck,
                {
                  backgroundColor: giftAid ? palette.sage600 : (isDark ? colors.backgroundGrouped : '#fff'),
                  borderColor: giftAid ? palette.sage600 : colors.separator,
                },
              ]}
            >
              {giftAid && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={[typography.subhead, { fontWeight: '600', color: palette.sage600 }]}>
                {t('support.giftAid')}
              </Text>
              <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                {t('support.giftAidDescription')}
              </Text>
              <Text style={[typography.caption2, { color: colors.textTertiary, marginTop: spacing['2xs'] }]}>
                {t('support.giftAidHint')}
              </Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Cover Processing Fees */}
        <Animated.View entering={FadeInDown.delay(380).duration(400)}>
          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: coverFees
                  ? (isDark ? 'rgba(15, 45, 82, 0.12)' : 'rgba(15, 45, 82, 0.06)')
                  : (isDark ? colors.backgroundGrouped : 'rgba(15, 45, 82, 0.03)'),
                borderColor: coverFees
                  ? colors.tint
                  : (isDark ? 'rgba(91, 155, 213, 0.2)' : 'rgba(15, 45, 82, 0.12)'),
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCoverFees(!coverFees);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: coverFees }}
            accessibilityLabel={t('support.coverFees')}
          >
            <View
              style={[
                styles.optionCheck,
                {
                  backgroundColor: coverFees ? colors.tint : (isDark ? colors.backgroundGrouped : '#fff'),
                  borderColor: coverFees ? colors.tint : colors.separator,
                },
              ]}
            >
              {coverFees && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={[typography.subhead, { fontWeight: '600', color: colors.tint }]}>
                {t('support.coverFees')}
              </Text>
              <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                {t('support.coverFeesDescription', { amount: `£${feeAmount.toFixed(2)}` })}
              </Text>
              <Text style={[typography.caption2, { color: colors.textTertiary, marginTop: spacing['2xs'] }]}>
                {t('support.coverFeesHint')}
              </Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Donate button */}
        <Animated.View entering={FadeInDown.delay(420).duration(400)}>
          <Pressable
            style={[
              styles.donateButton,
              {
                backgroundColor: isLoading ? colors.textTertiary : colors.tint,
              },
            ]}
            onPress={handleDonate}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            {isLoading ? (
              <Text style={[typography.headline, { color: colors.onPrimary }]}>
                {t('support.processing')}
              </Text>
            ) : (
              <>
                <Ionicons name="heart" size={20} color={colors.onPrimary} />
                <Text style={[typography.headline, { color: colors.onPrimary }]}>
                  {buttonLabel}
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Divider with "or" */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
          <Text style={[typography.footnote, { color: colors.textTertiary, marginHorizontal: spacing.md }]}>
            {t('support.or')}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.separator }]} />
        </View>

        {/* Bank transfer card */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <Pressable
            style={[
              styles.bankCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.separator,
                ...getElevation('sm', isDark),
              },
            ]}
            onPress={handleBankTransfer}
            accessibilityRole="button"
            accessibilityLabel={t('support.bankTransfer')}
          >
            <View style={[styles.bankIcon, { backgroundColor: colors.tint }]}>
              <Ionicons name="business-outline" size={20} color={colors.onPrimary} />
            </View>
            <View style={styles.bankText}>
              <Text style={[typography.headline, { color: colors.text }]}>
                {t('support.bankTransfer')}
              </Text>
              <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                {t('support.bankTransferHint')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <Text style={[typography.caption1, styles.footer, { color: colors.textTertiary }]}>
          {t('support.footer')}
        </Text>
      </AnimatedScrollView>

      {/* Bank Details Bottom Sheet */}
      <BankDetailsSheet
        visible={showBankDetails}
        onDismiss={() => setShowBankDetails(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  inlineHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSeparator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  largeTitleContainer: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  content: {
    paddingBottom: spacing['5xl'],
    paddingHorizontal: spacing['3xl'],
  },
  subtitle: {
    marginBottom: spacing['2xl'],
  },
  frequencyContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    marginBottom: spacing.xl,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    marginTop: spacing.md,
  },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  optionText: {
    flex: 1,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankText: {
    flex: 1,
    gap: spacing['2xs'],
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
});
