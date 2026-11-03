import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { M3Colors } from '../../theme/colors';

export interface BottomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  descriptors?: Record<string, any>;
  navigation?: {
    navigate: (name: string, params?: any) => void;
    emit?: (event: any) => any;
  };
  navigateToTab?: (routeKey: string) => void;
  insets?: any;
}

interface TabConfig {
  name: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  isSpecial?: boolean;
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'trips', title: 'Trips', icon: 'wallet-travel', activeIcon: 'wallet-travel' },
  { name: 'add', title: 'Add', icon: 'plus', activeIcon: 'plus', isSpecial: true },
  { name: 'activity', title: 'Activity', icon: 'history', activeIcon: 'history' },
  { name: 'profile', title: 'Profile', icon: 'account-outline', activeIcon: 'account' },
];

const SCOOP_WIDTH = 64;
const SCOOP_HEIGHT = 26;
const CIRCLE_SIZE = 42;
const PAD_X = 16;

export const CurvedFloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
  navigateToTab,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  // Determine current active route name
  const currentRoute = state.routes[state.index];
  const currentRouteName = currentRoute ? currentRoute.name : 'index';

  // Identify active slot index among the 5 tabs
  const activeSlot = useMemo(() => {
    const idx = TABS.findIndex((t) => t.name === currentRouteName);
    if (idx === -1 || idx === 2) return 0;
    return idx;
  }, [currentRouteName]);

  const activeTabConfig = TABS[activeSlot] || TABS[0];

  // Tab width based on measured bar width minus horizontal padding
  const availableWidth = barWidth > 0 ? barWidth - 2 * PAD_X : 0;
  const tabWidth = availableWidth > 0 ? availableWidth / 5 : 0;
  const rawX =
    tabWidth > 0
      ? PAD_X + tabWidth * (activeSlot + 0.5) - SCOOP_WIDTH / 2
      : 0;
  const targetX =
    barWidth > 0 ? Math.max(0, Math.min(barWidth - SCOOP_WIDTH, rawX)) : 0;

  // Animation values for ultra-fast, smooth native sliding and bounce
  const translateXAnim = useRef(new Animated.Value(targetX)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (tabWidth <= 0 || barWidth <= 0) return;

    const toValue = Math.max(
      0,
      Math.min(
        barWidth - SCOOP_WIDTH,
        PAD_X + tabWidth * (activeSlot + 0.5) - SCOOP_WIDTH / 2
      )
    );

    if (!hasInitialized.current) {
      translateXAnim.setValue(toValue);
      hasInitialized.current = true;
      return;
    }

    scaleAnim.setValue(0.75);

    // Fast, responsive, hardware-accelerated spring on the native UI thread
    Animated.parallel([
      Animated.spring(translateXAnim, {
        toValue,
        damping: 18,
        stiffness: 240,
        mass: 0.6,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeSlot, tabWidth, barWidth, translateXAnim, scaleAnim]);

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10);

  return (
    <View style={[styles.outerWrapper, { bottom: bottomInset }]} pointerEvents="box-none">
      <View
        style={styles.barContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - barWidth) > 1) {
            setBarWidth(w);
          }
        }}
      >
        {/* Unified Sliding Scoop & Floating Circle Layer (100% Synchronized, Zero Lag) */}
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingScoopWrapper,
              {
                transform: [{ translateX: translateXAnim }],
              },
            ]}
            pointerEvents="none"
          >
            {/* Pure Mathematical Concentric Circular Scoop SVG (Exact 6px halo gap everywhere) */}
            <Svg width={SCOOP_WIDTH} height={SCOOP_HEIGHT} viewBox="0 0 64 26">
              <Path
                d="M 0 0 A 6 6 0 0 1 5.82 4.55 A 27 27 0 0 0 58.21 4.55 A 6 6 0 0 1 64.03 0 Z"
                fill={M3Colors.surface}
              />
            </Svg>

            {/* Elevated Vibrant Emerald Circular Badge (Physically glued to the scoop, never desyncs) */}
            <Animated.View
              style={[
                styles.activeCircleBadge,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <MaterialCommunityIcons
                name={activeTabConfig.activeIcon}
                size={26}
                color="#FFFFFF"
              />
            </Animated.View>
          </Animated.View>
        )}

        {/* 5 Tab Buttons */}
        <View style={styles.tabsRow}>
          {TABS.map((tab, idx) => {
            const isTabActive = idx === activeSlot;

            if (tab.isSpecial) {
              // Center '+' Add Transaction Button (Raised 20px above bar, Soft Lavender / Indigo Purple)
              return (
                <TouchableOpacity
                  key={tab.name}
                  activeOpacity={0.8}
                  onPress={() => {
                    Vibration.vibrate(35);
                    router.push('/trip/add-expense');
                  }}
                  style={styles.tabSlot}
                  accessibilityLabel="Add Expense"
                  accessibilityRole="button"
                >
                  <View style={styles.centerPlusCircle}>
                    <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={tab.name}
                activeOpacity={0.7}
                onPress={() => {
                  if (currentRouteName !== tab.name) {
                    Vibration.vibrate(25);
                    if (navigation?.navigate) {
                      navigation.navigate(tab.name);
                    } else if (navigateToTab) {
                      const route = state.routes.find((r) => r.name === tab.name);
                      if (route) {
                        navigateToTab(route.key);
                      } else {
                        router.push(tab.name === 'index' ? '/(tabs)' : (`/(tabs)/${tab.name}` as any));
                      }
                    } else {
                      router.push(tab.name === 'index' ? '/(tabs)' : (`/(tabs)/${tab.name}` as any));
                    }
                  }
                }}
                style={styles.tabSlot}
                accessibilityLabel={tab.title}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={26}
                  color="#94A3B8"
                  style={{ opacity: isTabActive ? 0 : 1 }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  barContainer: {
    width: '100%',
    height: 60,
    borderRadius: 30, // Smooth capsule pill (not squarish!)
    backgroundColor: '#0F172A', // Jet Black / Dark Slate
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  slidingScoopWrapper: {
    position: 'absolute',
    top: -1, // Sits seamlessly over the bar top edge, eliminating any seam line
    left: 0,
    width: SCOOP_WIDTH,
    height: SCOOP_HEIGHT,
    alignItems: 'center',
    zIndex: 10,
  },
  activeCircleBadge: {
    position: 'absolute',
    top: -23, // Sits with an exact 6px equal concentric halo gap all the way around
    left: (SCOOP_WIDTH - CIRCLE_SIZE) / 2, // Centered perfectly within the 64px concentric scoop
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#10B981', // Vibrant Emerald Green
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: PAD_X,
    zIndex: 20,
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  centerPlusCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#818CF8', // Soft Lavender / Indigo Purple
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
    top: -20, // Raised 20px above the bar top line
    elevation: 10,
    shadowColor: '#818CF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
});
