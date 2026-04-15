import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography, getElevation, fontWeight, hairline } from '@/constants/Theme';
import { AmountSelector, BankDetailsSheet, DonationConfirmationSheet, TrustBadge } from '@/components/support';
import { IslamicPattern } from '@/components/brand/IslamicPattern';
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
  const alphaColors = getAlpha(effectiveScheme);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // State
  const [frequency, setFrequency] = useState<Frequency>('one-time');
  const [amount, setAmount] = useState<number | null>(25);
  const [isLoading, setIsLoading] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedAmount, setConfirmedAmount] = useState(0);
  const [giftAid, setGiftAid] = useState(false);
  const [coverFees, setCoverFees] = useState(false);

  const feeAmount = amount ? calculateFee(amount) : 0;
  const totalAmount = amount ? amount + (coverFees ? feeAmount : 0) : 0;

  // Rotate hadith daily (day of year % 10)
  const hadith = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const hadiths = t('support.hadiths', { returnObjects: true }) as { text: string; source: string }[];
    return hadiths[dayOfYear % hadiths.length];
  }, [t]);

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
        let browserResult: WebBrowser.WebBrowserResult | undefined;
        try {
          browserResult = await WebBrowser.openBrowserAsync(stripeUrl, {
            dismissButtonStyle: 'close',
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          });
        } catch {
          // Fallback: open in external browser if in-app browser fails
          await Linking.openURL(stripeUrl);
        }

        // Only show confirmation if the browser wasn't explicitly cancelled/dismissed
        // Note: we can't verify payment completion without deep link return,
        // but we can at least suppress confirmation on explicit cancellation
        if (browserResult?.type !== 'cancel') {
          setConfirmedAmount(totalAmount);
          setShowConfirmation(true);
        }
      } else {
        throw new Error(t('support.errorMessage'));
      }
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : t('support.errorMessage');
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert(t('support.error'), message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [amount, frequency, giftAid, coverFees, totalAmount, t]);

  const handleBankTransfer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowBankDetails(true);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.backgroundSecondary }]}>
      {/* Subtle Islamic pattern — sacred identity */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <IslamicPattern width={windowWidth} height={windowHeight} opacity={isDark ? 0.04 : 0.05} color={isDark ? palette.divineGoldBright : palette.divineGold} />
      </View>

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

        {/* Hadith — spiritual framing before the ask */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <View style={[styles.hadithCard, { backgroundColor: isDark ? colors.backgroundGrouped : colors.card, borderColor: isDark ? alphaColors.sapphireHadithBorder : colors.separator }]}>
            <Text style={[typography.callout, { color: colors.text, fontStyle: 'italic', lineHeight: 24 }]}>
              &ldquo;{hadith.text}&rdquo;
            </Text>
            <Text style={[typography.caption1, { color: colors.textTertiary, marginTop: spacing.sm }]}>
              — {hadith.source}
            </Text>
          </View>
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
                accessibilityLabel={t(`support.${freq === 'one-time' ? 'oneTime' : 'monthly'}`)}
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
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <AmountSelector
            selectedAmount={amount}
            onAmountChange={setAmount}
          />
        </Animated.View>

        {/* Enhance your gift — optional extras grouped together */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text style={[typography.sectionHeader, styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing['2xl'] }]}>
            {t('support.enhanceGift')}
          </Text>
        </Animated.View>

        {/* Gift Aid */}
        <Animated.View entering={FadeInDown.delay(320).duration(400)}>
          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: giftAid
                  ? alphaColors.sageBg
                  : (isDark ? colors.backgroundGrouped : colors.card),
                borderColor: giftAid
                  ? palette.sage600
                  : (isDark ? alphaColors.sageBorder : colors.separator),
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
                  backgroundColor: giftAid ? palette.sage600 : (isDark ? colors.backgroundGrouped : palette.white),
                  borderColor: giftAid ? palette.sage600 : (isDark ? colors.separator : palette.onyx400),
                },
              ]}
            >
              {giftAid && (
                <Animated.View entering={ZoomIn.duration(200).springify()}>
                  <Ionicons name="checkmark" size={16} color={palette.white} />
                </Animated.View>
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={[typography.subhead, { fontWeight: fontWeight.semibold, color: palette.sage600 }]}>
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
        <Animated.View entering={FadeInDown.delay(340).duration(400)}>
          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: coverFees
                  ? alphaColors.sapphireBg
                  : (isDark ? colors.backgroundGrouped : colors.card),
                borderColor: coverFees
                  ? colors.tint
                  : (isDark ? alphaColors.sapphireBorder : colors.separator),
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
                  backgroundColor: coverFees ? colors.tint : (isDark ? colors.backgroundGrouped : palette.white),
                  borderColor: coverFees ? colors.tint : (isDark ? colors.separator : palette.onyx400),
                },
              ]}
            >
              {coverFees && (
                <Animated.View entering={ZoomIn.duration(200).springify()}>
                  <Ionicons name="checkmark" size={16} color={palette.white} />
                </Animated.View>
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={[typography.subhead, { fontWeight: fontWeight.semibold, color: colors.tint }]}>
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

        {/* Donate Now — primary CTA (visually dominant) */}
        <Animated.View entering={FadeInDown.delay(380).duration(400)} style={{ marginTop: spacing['2xl'] }}>
          <Pressable
            style={[
              styles.methodCard,
              {
                backgroundColor: colors.tint,
                borderColor: colors.tint,
                ...getElevation('md', isDark),
              },
            ]}
            onPress={handleDonate}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={t('support.donateNow')}
          >
            <View style={[styles.methodIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="card-outline" size={20} color={colors.onPrimary} />
            </View>
            <View style={styles.methodText}>
              <Text style={[typography.headline, { color: colors.onPrimary }]}>
                {isLoading ? t('support.processing') : t('support.donateNow')}
              </Text>
              <Text style={[typography.footnote, { color: colors.onPrimary, opacity: 0.8 }]}>
                {t('support.donateNowHint')}
              </Text>
            </View>
            {!isLoading && (
              <View style={styles.methodRight}>
                {amount && amount >= 1 && (
                  <Text style={[typography.headline, { color: colors.onPrimary }]}>
                    £{totalAmount.toFixed(2)}
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.onPrimary} style={{ opacity: 0.7 }} />
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Trust signal — directly under CTA */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <TrustBadge />
        </Animated.View>

        {/* Bank Transfer — secondary alternative */}
        <Animated.View entering={FadeInDown.delay(420).duration(400)}>
          <Pressable
            style={[
              styles.methodCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.separator,
                ...getElevation('sm', isDark),
                marginTop: spacing.sm,
              },
            ]}
            onPress={handleBankTransfer}
            accessibilityRole="button"
            accessibilityLabel={t('support.bankTransfer')}
          >
            <View style={[styles.methodIcon, { backgroundColor: isDark ? colors.backgroundGrouped : colors.backgroundSecondary }]}>
              <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.methodText}>
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

        {/* Where your donation goes — reinforcement after commitment */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)}>
          <View style={[styles.impactCard, { backgroundColor: colors.card, borderColor: colors.separator, ...getElevation('sm', isDark) }]}>
            <Text style={[typography.headline, { color: colors.text, marginBottom: spacing['2xs'] }]}>
              {t('support.impactTitle')}
            </Text>
            <Text style={[typography.footnote, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              {t('support.impactSubtitle')}
            </Text>

            {[
              { icon: 'home-outline' as const, title: t('support.impactMaintenance'), desc: t('support.impactMaintenanceDesc'), bg: palette.sage600 },
              { icon: 'book-outline' as const, title: t('support.impactEducation'), desc: t('support.impactEducationDesc'), bg: palette.sapphire700 },
              { icon: 'people-outline' as const, title: t('support.impactCommunity'), desc: t('support.impactCommunityDesc'), bg: isDark ? palette.divineGoldBright : palette.divineGold },
            ].map((item, i) => (
              <View key={i} style={[styles.impactRow, i < 2 && { borderBottomColor: colors.separator, borderBottomWidth: hairline }]}>
                <View style={[styles.impactIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={18} color={palette.white} />
                </View>
                <View style={styles.impactText}>
                  <Text style={[typography.subhead, { fontWeight: fontWeight.semibold, color: colors.text }]}>{item.title}</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
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

      {/* Donation Confirmation */}
      <DonationConfirmationSheet
        visible={showConfirmation}
        onDismiss={() => setShowConfirmation(false)}
        amount={confirmedAmount}
        frequency={frequency}
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
    height: hairline,
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
    marginBottom: spacing.lg,
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
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  optionText: {
    flex: 1,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: spacing.md,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodText: {
    flex: 1,
    gap: spacing['2xs'],
  },
  methodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  impactCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  impactIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactText: {
    flex: 1,
    gap: spacing['2xs'],
  },
  hadithCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing['2xl'],
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
});
