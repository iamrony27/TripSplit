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

const SCOOP_WIDTH = 84;
const SCOOP_HEIGHT = 40;
const CIRCLE_SIZE = 46;

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
    // If not found or if on special action tab 'add', fallback to 0 or preserve
    if (idx === -1 || idx === 2) return 0;
    return idx;
  }, [currentRouteName]);

  const activeTabConfig = TABS[activeSlot] || TABS[0];

  // Tab width based on measured bar width
  const tabWidth = barWidth > 0 ? barWidth / 5 : 0;
  const targetX = tabWidth > 0 ? tabWidth * (activeSlot + 0.5) - SCOOP_WIDTH / 2 : 0;

  // Animation values
  const translateXAnim = useRef(new Animated.Value(targetX)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (tabWidth <= 0) return;

    const toValue = tabWidth * (activeSlot + 0.5) - SCOOP_WIDTH / 2;

    if (!hasInitialized.current) {
      translateXAnim.setValue(toValue);
      hasInitialized.current = true;
      return;
    }

    scaleAnim.setValue(0.72);

    Animated.parallel([
      Animated.spring(translateXAnim, {
        toValue,
        damping: 20,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeSlot, tabWidth, translateXAnim, scaleAnim]);

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10);

  return (
    <View style={[styles.outerWrapper, { bottom: bottomInset }]} pointerEvents="box-none">
      <View
        style={styles.barContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && w !== barWidth) {
            setBarWidth(w);
          }
        }}
      >
        {/* Sliding Scoop & Floating Circle Layer */}
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
            {/* Smooth Scoop Cutout SVG */}
            <Svg width={SCOOP_WIDTH} height={SCOOP_HEIGHT} viewBox="0 0 84 40">
              <Path
                d="M 0 0 L 84 0 L 84 14 C 74 14, 68 16, 64 21 C 57 29, 51 40, 42 40 C 33 40, 27 29, 20 21 C 16 16, 10 14, 0 14 Z"
                fill={M3Colors.surface}
              />
            </Svg>

            {/* Elevated Vibrant Emerald Circular Badge */}
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
                size={23}
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
              // Center '+' Add Transaction Button
              return (
                <TouchableOpacity
                  key={tab.name}
                  activeOpacity={0.75}
                  onPress={() => {
                    Vibration.vibrate(35);
                    router.push('/trip/add-expense');
                  }}
                  style={styles.tabSlot}
                  accessibilityLabel="Add Expense"
                  accessibilityRole="button"
                >
                  <View style={styles.centerPlusCircle}>
                    <MaterialCommunityIcons name="plus" size={24} color="#10B981" />
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
    width: '100%',
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F172A', // Jet Black / Dark Slate
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  slidingScoopWrapper: {
    position: 'absolute',
    top: -14,
    left: 0,
    width: SCOOP_WIDTH,
    height: SCOOP_HEIGHT,
    alignItems: 'center',
    zIndex: 10,
  },
  activeCircleBadge: {
    position: 'absolute',
    top: -6,
    left: (SCOOP_WIDTH - CIRCLE_SIZE) / 2,
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
    zIndex: 20,
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  centerPlusCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
