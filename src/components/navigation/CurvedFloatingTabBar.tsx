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

const BAR_HEIGHT = 60;
const BAR_RADIUS = 20;
const PAD_X = 28;
const CIRCLE_SIZE = 42;

/**
 * Mathematically exact SVG path for the dark capsule bar with a 100% transparent cutout scoop.
 * Slope-continuous C1 arcs ensure seamless zero-seam tangent transitions.
 */
const getCutoutBarPath = (
  width: number,
  height: number,
  radius: number,
  cx: number
): string => {
  if (width <= 0 || cx <= 0) return '';

  const circleCy = -2;
  const scoopR = 27; // 21px circle radius + 6px concentric gap
  const earR = 8;
  const d = scoopR + earR; // 35
  const deltaY = earR - circleCy; // 10
  const deltaX = Math.sqrt(d * d - deltaY * deltaY); // ~33.541

  const leftContactX = (cx - (scoopR * deltaX) / d).toFixed(2);
  const leftContactY = (circleCy + (scoopR * deltaY) / d).toFixed(2);
  const rightContactX = (cx + (scoopR * deltaX) / d).toFixed(2);
  const rightContactY = leftContactY;

  const leftStart = (cx - deltaX).toFixed(2);
  const rightEnd = (cx + deltaX).toFixed(2);

  const x1 = radius;
  const x2 = width - radius;
  const y1 = radius;
  const y2 = height - radius;

  return [
    `M ${x1} 0`,
    `L ${leftStart} 0`,
    `A ${earR} ${earR} 0 0 1 ${leftContactX} ${leftContactY}`,
    `A ${scoopR} ${scoopR} 0 0 0 ${rightContactX} ${rightContactY}`,
    `A ${earR} ${earR} 0 0 1 ${rightEnd} 0`,
    `L ${x2} 0`,
    `A ${radius} ${radius} 0 0 1 ${width} ${y1}`,
    `L ${width} ${y2}`,
    `A ${radius} ${radius} 0 0 1 ${x2} ${height}`,
    `L ${x1} ${height}`,
    `A ${radius} ${radius} 0 0 1 0 ${y2}`,
    `L 0 ${y1}`,
    `A ${radius} ${radius} 0 0 1 ${x1} 0`,
    `Z`,
  ].join(' ');
};

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
  const cx = barWidth > 0 ? PAD_X + tabWidth * (activeSlot + 0.5) : 0;

  // Animation values for the elevated active badge
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scaleAnim.setValue(0.72);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 130,
      useNativeDriver: true,
    }).start();
  }, [activeSlot, scaleAnim]);

  // Compute SVG cutout bar path whenever barWidth or cx updates
  const pathD = useMemo(() => {
    if (barWidth <= 0 || cx <= 0) return '';
    return getCutoutBarPath(barWidth, BAR_HEIGHT, BAR_RADIUS, cx);
  }, [barWidth, cx]);

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
        {/* Background SVG with True Native Transparent Cutout */}
        {barWidth > 0 && pathD !== '' && (
          <Svg
            width={barWidth}
            height={BAR_HEIGHT}
            style={styles.svgBackground}
            pointerEvents="none"
          >
            <Path d={pathD} fill="#0F172A" />
          </Svg>
        )}

        {/* Elevated Vibrant Emerald Circular Badge */}
        {barWidth > 0 && cx > 0 && (
          <Animated.View
            style={[
              styles.activeCircleBadge,
              {
                left: cx - CIRCLE_SIZE / 2,
                transform: [{ scale: scaleAnim }],
              },
            ]}
            pointerEvents="none"
          >
            <MaterialCommunityIcons
              name={activeTabConfig.activeIcon}
              size={22}
              color="#FFFFFF"
            />
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
                    <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
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
                  size={22}
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
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  activeCircleBadge: {
    position: 'absolute',
    top: -23, // 42px diameter, center at y = -2, so top = -2 - 21 = -23
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
    zIndex: 15,
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
    width: 50,
    height: 50,
    borderRadius: 25,
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
