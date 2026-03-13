/**
 * Qibla Compass Screen
 *
 * Full compass with animated needle pointing toward the Kaaba.
 * Uses the device magnetometer via useQiblaCompass hook and
 * adhan-js for great-circle Qibla bearing calculation.
 */
import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Line, Text as SvgText, G, Path } from 'react-native-svg';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { useQiblaCompass } from '@/hooks/useQiblaCompass';

const COMPASS_SIZE = 280;
const COMPASS_RADIUS = COMPASS_SIZE / 2;
const TICK_OUTER = COMPASS_RADIUS - 8;
const TICK_INNER_MAJOR = COMPASS_RADIUS - 24;
const TICK_INNER_MINOR = COMPASS_RADIUS - 16;

/** Cardinal directions at their degree positions */
const CARDINALS = [
  { label: 'N', deg: 0 },
  { label: 'E', deg: 90 },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
];

/**
 * Animated wrapper that uses spring interpolation for smooth
 * compass rotation with shortest-path angle handling.
 */
function useAnimatedRotation(targetDeg: number) {
  // Wrap angle so spring always takes shortest path
  const animatedDeg = useDerivedValue(() => {
    return withSpring(-targetDeg, {
      damping: 20,
      stiffness: 90,
      mass: 1,
    });
  }, [targetDeg]);

  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${animatedDeg.value}deg` }],
  }));
}

export default function QiblaScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const {
    qiblaBearing,
    deviceHeading,
    relativeAngle,
    direction,
    sensorAvailable,
    calibrationNeeded,
    cardinalDirection,
  } = useQiblaCompass();

  // Compass rose rotates opposite to device heading so North stays fixed
  const compassRotation = useAnimatedRotation(deviceHeading ?? 0);

  const isFound = direction === 'found';
  const accentColor = isDark ? palette.divineGoldBright : palette.divineGold;
  const compassBg = isDark ? '#1A1A1E' : '#F9F7F2';
  const tickColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';
  const cardinalColor = isDark ? '#F5F5F7' : '#121216';

  // Direction hint text
  const getDirectionText = () => {
    switch (direction) {
      case 'found': return t('qibla.qiblaFound');
      case 'turnLeft': return t('qibla.turnLeft');
      case 'turnRight': return t('qibla.turnRight');
      case 'turnSlightLeft': return t('qibla.turnSlightLeft');
      case 'turnSlightRight': return t('qibla.turnSlightRight');
      default: return '';
    }
  };

  // Web or no sensor fallback
  if (Platform.OS === 'web' || !sensorAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.fallback}>
          <Ionicons name="compass-outline" size={64} color={colors.textTertiary} />
          <Text style={[typography.title2, { color: colors.text, marginTop: spacing.xl }]}>
            {t('qibla.title')}
          </Text>
          <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            {t('qibla.noSensor')}
          </Text>
          <Text style={[typography.body, styles.bearingFallback, { color: colors.textSecondary }]}>
            {t('qibla.bearing', {
              degrees: Math.round(qiblaBearing),
              cardinal: t(`qibla.${cardinalDirection}`),
            })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Title */}
      <Text style={[typography.title2, styles.title, { color: colors.text }]}>
        {t('qibla.title')}
      </Text>

      {/* Bearing info */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.bearingRow}>
        <Text style={[typography.caption1, { color: colors.textSecondary, letterSpacing: 1 }]}>
          {t('qibla.bearing', {
            degrees: Math.round(qiblaBearing),
            cardinal: t(`qibla.${cardinalDirection}`),
          })}
        </Text>
      </Animated.View>

      {/* Compass */}
      <View style={styles.compassWrapper}>
        <Animated.View style={[styles.compassContainer, compassRotation]}>
          <Svg
            width={COMPASS_SIZE}
            height={COMPASS_SIZE}
            viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}
          >
            {/* Outer ring */}
            <Circle
              cx={COMPASS_RADIUS}
              cy={COMPASS_RADIUS}
              r={COMPASS_RADIUS - 4}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
              strokeWidth={1}
            />

            {/* Tick marks — 360 degrees, major every 30° */}
            {Array.from({ length: 72 }, (_, i) => {
              const deg = i * 5;
              const isMajor = deg % 30 === 0;
              const inner = isMajor ? TICK_INNER_MAJOR : TICK_INNER_MINOR;
              const rad = (deg * Math.PI) / 180;
              const x1 = COMPASS_RADIUS + inner * Math.sin(rad);
              const y1 = COMPASS_RADIUS - inner * Math.cos(rad);
              const x2 = COMPASS_RADIUS + TICK_OUTER * Math.sin(rad);
              const y2 = COMPASS_RADIUS - TICK_OUTER * Math.cos(rad);
              return (
                <Line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMajor ? cardinalColor : tickColor}
                  strokeWidth={isMajor ? 1.5 : 0.75}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Cardinal labels */}
            {CARDINALS.map(({ label, deg }) => {
              const rad = (deg * Math.PI) / 180;
              const labelRadius = COMPASS_RADIUS - 38;
              const x = COMPASS_RADIUS + labelRadius * Math.sin(rad);
              const y = COMPASS_RADIUS - labelRadius * Math.cos(rad);
              return (
                <SvgText
                  key={label}
                  x={x}
                  y={y + 5}
                  fill={label === 'N' ? accentColor : cardinalColor}
                  fontSize={label === 'N' ? 16 : 13}
                  fontWeight={label === 'N' ? '700' : '500'}
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              );
            })}

            {/* Qibla needle — points from center toward Qibla bearing */}
            <G rotation={qiblaBearing} origin={`${COMPASS_RADIUS}, ${COMPASS_RADIUS}`}>
              {/* Needle body */}
              <Path
                d={`M ${COMPASS_RADIUS - 6} ${COMPASS_RADIUS}
                    L ${COMPASS_RADIUS} ${COMPASS_RADIUS - COMPASS_RADIUS + 50}
                    L ${COMPASS_RADIUS + 6} ${COMPASS_RADIUS} Z`}
                fill={isFound ? accentColor : (isDark ? palette.sapphire400 : palette.sapphire700)}
                opacity={0.9}
              />
              {/* Kaaba indicator at tip */}
              <Circle
                cx={COMPASS_RADIUS}
                cy={50}
                r={6}
                fill={accentColor}
              />
              {/* Kaaba symbol — small square */}
              <Path
                d={`M ${COMPASS_RADIUS - 3} ${47}
                    L ${COMPASS_RADIUS + 3} ${47}
                    L ${COMPASS_RADIUS + 3} ${53}
                    L ${COMPASS_RADIUS - 3} ${53} Z`}
                fill={isDark ? '#0A0A0C' : '#F9F7F2'}
              />
            </G>

            {/* Center dot */}
            <Circle
              cx={COMPASS_RADIUS}
              cy={COMPASS_RADIUS}
              r={4}
              fill={cardinalColor}
            />
          </Svg>
        </Animated.View>

        {/* Fixed pointer at top — shows where device is pointing */}
        <View style={styles.topPointer}>
          <Ionicons
            name="caret-down"
            size={20}
            color={accentColor}
          />
        </View>
      </View>

      {/* Direction hint */}
      <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.directionContainer}>
        <Text style={[
          isFound ? typography.title2 : typography.headline,
          {
            color: isFound ? accentColor : colors.text,
            textAlign: 'center',
          },
        ]}>
          {getDirectionText()}
        </Text>

        {relativeAngle !== null && !isFound && (
          <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {Math.abs(Math.round(relativeAngle))}°
          </Text>
        )}
      </Animated.View>

      {/* Calibration warning */}
      {calibrationNeeded && (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.calibrationBanner, {
          backgroundColor: isDark ? 'rgba(229,193,75,0.1)' : 'rgba(212,175,55,0.08)',
        }]}>
          <Ionicons name="alert-circle-outline" size={16} color={accentColor} />
          <Text style={[typography.footnote, { color: accentColor, marginLeft: spacing.sm }]}>
            {t('qibla.calibrationNeeded')}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    marginTop: spacing['3xl'],
  },
  bearingRow: {
    marginTop: spacing.sm,
  },
  compassWrapper: {
    marginTop: spacing['4xl'],
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
  },
  topPointer: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
  },
  directionContainer: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  calibrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  bearingFallback: {
    marginTop: spacing.xl,
  },
});
