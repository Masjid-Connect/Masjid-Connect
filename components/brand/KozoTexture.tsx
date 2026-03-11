/**
 * Kozo Paper Noise Texture — Skia RuntimeShader
 *
 * Generates subtle Perlin-like noise on the GPU to give limestone
 * surfaces the warm, organic feeling of handmade Japanese paper.
 *
 * This is what was removed from KozoPaperBackground because SVG
 * fiber at 0.02 opacity was imperceptible yet costly. Skia noise
 * shaders cost essentially nothing on the GPU.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Rect,
  Skia,
  Shader,
  Fill,
  RuntimeShader,
} from '@shopify/react-native-skia';

const GRAIN_SHADER = Skia.RuntimeEffect.Make(`
  uniform float2 iResolution;
  uniform float grainIntensity;
  uniform float grainScale;

  // Simple hash-based noise — fast, good enough for fine grain
  float hash(float2 p) {
    float3 p3 = fract(float3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Value noise with smooth interpolation
  float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep

    float a = hash(i);
    float b = hash(i + float2(1.0, 0.0));
    float c = hash(i + float2(0.0, 1.0));
    float d = hash(i + float2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  half4 main(float2 fragCoord) {
    float2 uv = fragCoord / grainScale;
    float n = noise(uv);
    // Center around 0.5, scale by intensity
    float grain = (n - 0.5) * grainIntensity;
    return half4(grain, grain, grain, abs(grain));
  }
`)!;

interface KozoTextureProps {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Grain intensity — how visible the noise is (default 0.06) */
  grainIntensity?: number;
  /** Grain scale — size of noise features in points (default 2.0) */
  grainScale?: number;
}

export const KozoTexture = ({
  width,
  height,
  grainIntensity = 0.06,
  grainScale = 2.0,
}: KozoTextureProps) => {
  if (!GRAIN_SHADER) return null;

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Fill>
        <RuntimeShader
          source={GRAIN_SHADER}
          uniforms={{
            iResolution: [width, height],
            grainIntensity,
            grainScale,
          }}
        />
      </Fill>
    </Canvas>
  );
};
