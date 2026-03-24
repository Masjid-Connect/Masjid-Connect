/**
 * WebContainer — Mobile-optimized web wrapper
 *
 * On web, constrains the app to a max-width appropriate for a mobile
 * experience and centers it on larger viewports. On native, renders
 * children directly with no wrapper.
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const MAX_WIDTH = 480;

interface WebContainerProps {
  children: React.ReactNode;
  backgroundColor?: string;
}

export const WebContainer = ({ children, backgroundColor }: WebContainerProps) => {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.outer, backgroundColor ? { backgroundColor } : undefined]}>
      <View style={styles.inner}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
  },
});
