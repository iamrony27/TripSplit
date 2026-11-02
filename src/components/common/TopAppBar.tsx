import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

interface TopAppBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  avatarUrl?: string;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  rightAction?: React.ReactNode;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle = 'TripSplit',
  showBack = false,
  onBackPress,
  avatarUrl,
  onProfilePress,
  onNotificationPress,
  rightAction,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;
  const topInset = Math.max(insets.top, statusBarHeight);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.appBarInner}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iconButton}
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={M3Colors.onSurface}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons
              name="wallet-travel"
              size={20}
              color={M3Colors.onPrimary}
            />
          </View>
        )}

        <View style={styles.titleColumn}>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <Text
            style={styles.titleText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {title}
          </Text>
        </View>
      </View>

      <View style={styles.rightContainer}>
        {rightAction ? (
          rightAction
        ) : (
          <>
            <TouchableOpacity
              onPress={onNotificationPress}
              style={styles.iconButton}
              accessibilityLabel="Notifications"
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={22}
                color={M3Colors.onSurfaceVariant}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onProfilePress || (() => router.push('/(tabs)/profile' as any))}
              style={styles.avatarButton}
              accessibilityLabel="Profile"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <MaterialCommunityIcons
                    name="account"
                    size={20}
                    color={M3Colors.primary}
                  />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: M3Colors.surface,
  },
  appBarInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: M3Shapes.spacing.md,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: M3Shapes.spacing.sm,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: M3Shapes.input,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
  },
  subtitleText: {
    ...M3Typography.labelSm,
    color: M3Colors.primary,
    textTransform: 'uppercase',
    fontWeight: '700',
    lineHeight: 14,
  },
  titleText: {
    ...M3Typography.titleLg,
    color: M3Colors.onSurface,
    lineHeight: 24,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: M3Shapes.spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: M3Shapes.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: M3Shapes.pill,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: M3Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
