/**
 * useQiblaCompass — combines device heading with Qibla bearing calculation.
 *
 * Returns the Qibla bearing from True North and the relative angle the user
 * needs to turn, plus a direction hint ("turn left/right/found").
 *
 * Uses adhan-js Qibla() for great-circle bearing math and useDeviceHeading
 * for the magnetometer compass.
 */
import { useMemo } from 'react';
import { Qibla, Coordinates } from 'adhan';
import { useDeviceHeading } from './useDeviceHeading';
import { SALAFI_MASJID } from '@/constants/mosque';

/** Threshold in degrees to consider Qibla "found" */
const QIBLA_FOUND_THRESHOLD = 3;
/** Threshold for "slight turn" hint */
const SLIGHT_TURN_THRESHOLD = 15;

type QiblaDirection = 'found' | 'turnLeft' | 'turnRight' | 'turnSlightLeft' | 'turnSlightRight' | 'unknown';

interface UseQiblaCompassResult {
  /** Qibla bearing from True North in degrees (constant for a given location) */
  qiblaBearing: number;
  /** Current device heading from True North (0-360), null if sensor unavailable */
  deviceHeading: number | null;
  /** Relative angle to Qibla: negative = turn left, positive = turn right */
  relativeAngle: number | null;
  /** Human-readable direction hint */
  direction: QiblaDirection;
  /** Whether the compass sensor is available */
  sensorAvailable: boolean;
  /** Whether calibration is needed */
  calibrationNeeded: boolean;
  /** Cardinal direction of Qibla (N, NE, E, SE, S, SW, W, NW) */
  cardinalDirection: string;
}

/** Get cardinal direction from bearing */
function getCardinal(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Compute the shortest-path signed angle between two bearings.
 * Returns value in [-180, 180]: negative = turn left, positive = turn right.
 */
function shortestAngle(from: number, to: number): number {
  let diff = to - from;
  // Normalize to [-180, 180]
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

export function useQiblaCompass(): UseQiblaCompassResult {
  const { heading: deviceHeading, available: sensorAvailable, calibrationNeeded } = useDeviceHeading(100);

  // Calculate Qibla bearing once (constant for a given location)
  const qiblaBearing = useMemo(() => {
    const coords = new Coordinates(SALAFI_MASJID.latitude, SALAFI_MASJID.longitude);
    return Qibla(coords);
  }, []);

  const cardinalDirection = useMemo(() => getCardinal(qiblaBearing), [qiblaBearing]);

  // Relative angle: how far the user needs to turn
  const relativeAngle = deviceHeading !== null
    ? shortestAngle(deviceHeading, qiblaBearing)
    : null;

  // Direction hint
  let direction: QiblaDirection = 'unknown';
  if (relativeAngle !== null) {
    const absAngle = Math.abs(relativeAngle);
    if (absAngle <= QIBLA_FOUND_THRESHOLD) {
      direction = 'found';
    } else if (absAngle <= SLIGHT_TURN_THRESHOLD) {
      direction = relativeAngle < 0 ? 'turnSlightLeft' : 'turnSlightRight';
    } else {
      direction = relativeAngle < 0 ? 'turnLeft' : 'turnRight';
    }
  }

  return {
    qiblaBearing,
    deviceHeading,
    relativeAngle,
    direction,
    sensorAvailable,
    calibrationNeeded,
    cardinalDirection,
  };
}
