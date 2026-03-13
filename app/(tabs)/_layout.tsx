import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { typography } from '@/constants/Theme';
import { AmbientTabBar } from '@/components/navigation/AmbientTabIndicator';

export default function TabLayout() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <AmbientTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: typography.headline.fontSize,
          fontWeight: '600' as const,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.prayerTimes'),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={24}
              color={color}
            />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: t('tabs.announcements'),
          headerShown: false,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons
              name={focused ? 'megaphone' : 'megaphone-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t('tabs.events'),
          headerShown: false,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
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
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
