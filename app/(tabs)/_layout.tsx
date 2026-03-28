import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { AmbientTabBar } from '@/components/navigation/AmbientTabIndicator';
import { Sentry } from '@/lib/sentry';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { useLiveLesson } from '@/hooks/useLiveLesson';

function TabLayoutInner() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const { isLive } = useLiveLesson();

  return (
    <Tabs
      tabBar={(props) => <AmbientTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        animation: 'fade',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.prayer'),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t('tabs.community'),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View>
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={24}
                color={color}
              />
              {isLive && (
                <View style={[
                  tabStyles.liveDot,
                  { backgroundColor: isDark ? palette.divineGoldBright : palette.divineGold },
                ]} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: t('tabs.support'),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  liveDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default function TabLayout() {
  return (
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
      <ErrorFallback error={error} resetError={resetError} />
    )}>
      <TabLayoutInner />
    </Sentry.ErrorBoundary>
  );
}
