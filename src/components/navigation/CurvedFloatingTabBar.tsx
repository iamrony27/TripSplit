import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Vibration,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';

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
const CIRCLE_SIZE = 42;
const PAD_X = 26;
const BAR_HEIGHT = 60;
const BAR_RADIUS = 24;

export const CurvedFloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
  navigateToTab,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const initialWidth = Dimensions.get('window').width - 32;
  const [barWidth, setBarWidth] = useState(initialWidth > 0 ? initialWidth : 360);

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

  // Pure Mathematical Cutout Path for the Dark Navy Capsule Bar
  // Guarantees 100% true native transparency in the scoop notch so background cards/avatars show through completely!
  const barCutoutPath = useMemo(() => {
    if (barWidth <= 0 || tabWidth <= 0) return '';
    const cx = PAD_X + tabWidth * (activeSlot + 0.5);
    const circleCy = -2;
    const scoopR = 27;
    const earR = 6;
    const d = scoopR + earR; // 33
    const deltaY = earR - circleCy; // 8
    const deltaX = Math.sqrt(d * d - deltaY * deltaY); // ~32.0156
    const contactDeltaX = scoopR * (deltaX / d); // ~26.195
    const contactDeltaY = scoopR * (deltaY / d); // ~6.545
    const contactY = circleCy + contactDeltaY; // ~4.55

    const leftStart = Math.max(BAR_RADIUS, Number((cx - deltaX).toFixed(2)));
    const rightEnd = Math.min(barWidth - BAR_RADIUS, Number((cx + deltaX).toFixed(2)));
    const contactLeftX = Number((cx - contactDeltaX).toFixed(2));
    const contactRightX = Number((cx + contactDeltaX).toFixed(2));
    const contactYFixed = Number(contactY.toFixed(2));

    const x1 = BAR_RADIUS;
    const x2 = barWidth - BAR_RADIUS;
    const y1 = BAR_RADIUS;
    const y2 = BAR_HEIGHT - BAR_RADIUS;

    return [
      `M ${x1} 0`,
      `L ${leftStart} 0`,
      `A ${earR} ${earR} 0 0 1 ${contactLeftX} ${contactYFixed}`,
      `A ${scoopR} ${scoopR} 0 0 0 ${contactRightX} ${contactYFixed}`,
      `A ${earR} ${earR} 0 0 1 ${rightEnd} 0`,
      `L ${x2} 0`,
      `A ${BAR_RADIUS} ${BAR_RADIUS} 0 0 1 ${barWidth} ${y1}`,
      `L ${barWidth} ${y2}`,
      `A ${BAR_RADIUS} ${BAR_RADIUS} 0 0 1 ${x2} ${BAR_HEIGHT}`,
      `L ${x1} ${BAR_HEIGHT}`,
      `A ${BAR_RADIUS} ${BAR_RADIUS} 0 0 1 0 ${y2}`,
      `L 0 ${y1}`,
      `A ${BAR_RADIUS} ${BAR_RADIUS} 0 0 1 ${x1} 0`,
      'Z',
    ].join(' ');
  }, [barWidth, tabWidth, activeSlot]);

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10);

  return (
    <View style={[styles.outerWrapper, { bottom: bottomInset }]} pointerEvents="box-none">
      <View
        style={[styles.barContainer, { width: barWidth > 0 ? barWidth : '100%' }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - barWidth) > 1) {
            setBarWidth(w);
          }
        }}
      >
        {/* Dark Navy Capsule Bar with Mathematical Cutout Notch (100% True Native Transparency) */}
        {barWidth > 0 && (
          <Svg
            width={barWidth}
            height={BAR_HEIGHT}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Path d={barCutoutPath} fill="#0F172A" />
          </Svg>
        )}

        {/* Sliding Elevated Floating Circle Badge (Zero Opaque Layers, True Transparency) */}
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingBadgeWrapper,
              {
                transform: [{ translateX: translateXAnim }],
              },
            ]}
            pointerEvents="none"
          >
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
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  slidingBadgeWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCOOP_WIDTH,
    height: BAR_HEIGHT,
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
