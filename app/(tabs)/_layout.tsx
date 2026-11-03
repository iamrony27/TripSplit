import React from 'react';
import { Tabs } from 'expo-router';
import { CurvedFloatingTabBar } from '../../src/components/navigation/CurvedFloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CurvedFloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
      <Tabs.Screen name="add" options={{ title: 'Add' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
    </Tabs>
  );
}
