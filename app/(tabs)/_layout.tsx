import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { getColors } from '@/constants/Colors';
import { BrandTabIcon } from '@/components/brand/BrandTabIcon';
import { useTheme } from '@/contexts/ThemeContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: effectiveScheme === 'dark' ? '#161B22' : '#FFFFFF',
          borderTopColor: colors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 4,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: effectiveScheme === 'dark' ? '#161B22' : '#FFFFFF',
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Prayer Times',
          tabBarIcon: ({ color, focused }) => (
            <BrandTabIcon focused={focused} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'Announcements',
          tabBarIcon: ({ color }) => <TabBarIcon name="bullhorn" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
