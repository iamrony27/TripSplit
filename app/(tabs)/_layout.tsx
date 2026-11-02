import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';

interface CenterAddButtonProps {
  onPress: () => void;
}

const CenterAddButton: React.FC<CenterAddButtonProps> = ({ onPress }) => {
  return (
    <View style={styles.centerButtonWrapper} pointerEvents="box-none">
      <TouchableOpacity
        onPress={onPress}
        style={styles.centerButton}
        activeOpacity={0.85}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="plus" size={30} color={M3Colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: M3Colors.primary,
        tabBarInactiveTintColor: M3Colors.onSurfaceVariant,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 60 + bottomInset,
            paddingBottom: bottomInset,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* 1. Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MaterialCommunityIcons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={focused ? M3Colors.primary : ((color as string) || M3Colors.onSurfaceVariant)}
              />
            </View>
          ),
        }}
      />

      {/* 2. Trips Tab */}
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MaterialCommunityIcons
                name={focused ? 'wallet-travel' : 'wallet-travel'}
                size={22}
                color={focused ? M3Colors.primary : ((color as string) || M3Colors.onSurfaceVariant)}
              />
            </View>
          ),
        }}
      />

      {/* 3. Center Raised Floating + Action Button */}
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: () => (
            <CenterAddButton onPress={() => router.push('/trip/add-expense')} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/trip/add-expense');
          },
        }}
      />

      {/* 4. Activity Tab */}
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MaterialCommunityIcons
                name={focused ? 'history' : 'history'}
                size={22}
                color={focused ? M3Colors.primary : ((color as string) || M3Colors.onSurfaceVariant)}
              />
            </View>
          ),
        }}
      />

      {/* 5. Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MaterialCommunityIcons
                name={focused ? 'account-circle' : 'account-circle-outline'}
                size={22}
                color={focused ? M3Colors.primary : ((color as string) || M3Colors.onSurfaceVariant)}
              />
            </View>
          ),
        }}
      />

      {/* Analytics (accessible from within the app, hidden from tab bar to keep 5 slots) */}
      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabBarLabel: {
    ...M3Typography.labelSm,
    fontWeight: '700',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  iconContainer: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    backgroundColor: M3Colors.primaryContainer,
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  centerButton: {
    top: -14,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: M3Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    borderWidth: 3.5,
    borderColor: M3Colors.surfaceContainerLow,
  },
});
