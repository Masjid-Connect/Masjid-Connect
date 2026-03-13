/**
 * useDeviceHeading — subscribes to the device magnetometer and returns
 * a compass heading in degrees from True North (0-360).
 *
 * Returns null when the sensor is unavailable.
 * Uses expo-sensors Magnetometer with configurable update interval.
 */
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Magnetometer } from 'expo-sensors';

interface UseDeviceHeadingResult {
  /** Heading in degrees from True North (0-360), or null if unavailable */
  heading: number | null;
  /** Whether the magnetometer sensor is available */
  available: boolean;
  /** Whether calibration may be needed (low accuracy signal) */
  calibrationNeeded: boolean;
}

/** Calculate heading from magnetometer x/y values */
function calculateHeading(x: number, y: number): number {
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  // Normalize to 0-360
  angle = (angle + 360) % 360;
  // atan2 gives angle from East, we want from North
  // On most devices: heading = (90 - angle + 360) % 360
  // But the exact mapping depends on device orientation
  return (90 - angle + 360) % 360;
}

export function useDeviceHeading(updateIntervalMs: number = 100): UseDeviceHeadingResult {
  const [heading, setHeading] = useState<number | null>(null);
  const [available, setAvailable] = useState(true);
  const [calibrationNeeded, setCalibrationNeeded] = useState(false);
  const magnitudeHistory = useRef<number[]>([]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setAvailable(false);
      return;
    }

    let subscription: ReturnType<typeof Magnetometer.addListener> | null = null;

    const start = async () => {
      const isAvailable = await Magnetometer.isAvailableAsync();
      setAvailable(isAvailable);
      if (!isAvailable) return;

      Magnetometer.setUpdateInterval(updateIntervalMs);

      subscription = Magnetometer.addListener((data) => {
        const { x, y, z } = data;
        const newHeading = calculateHeading(x, y);
        setHeading(newHeading);

        // Track magnitude for calibration detection
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const history = magnitudeHistory.current;
        history.push(magnitude);
        if (history.length > 20) history.shift();

        // If magnitude varies wildly, suggest calibration
        if (history.length >= 10) {
          const min = Math.min(...history);
          const max = Math.max(...history);
          setCalibrationNeeded(max - min > 100);
        }
      });
    };

    start();

    return () => {
      subscription?.remove();
    };
  }, [updateIntervalMs]);

  return { heading, available, calibrationNeeded };
}
