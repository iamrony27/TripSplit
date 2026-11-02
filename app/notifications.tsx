import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrips } from '../src/context/TripContext';
import { TopAppBar } from '../src/components/common/TopAppBar';
import { AppNotification, NotificationType } from '../src/types/notification';
import { isSoundEnabled, setSoundEnabled } from '../src/services/audio/soundService';
import { M3Colors } from '../src/theme/colors';
import { M3Typography } from '../src/theme/typography';
import { M3Shapes } from '../src/theme/shapes';

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    playNotificationSound,
  } = useTrips();

  const [soundOn, setSoundOn] = useState<boolean>(true);

  useEffect(() => {
    isSoundEnabled().then((enabled) => setSoundOn(enabled));
  }, []);

  const handleToggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);
    await setSoundEnabled(next);
    if (next) {
      playNotificationSound();
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'JOIN_REQUEST_RECEIVED':
        return { name: 'account-plus', color: '#E65100', bg: '#FFE0B2' };
      case 'JOIN_REQUEST_APPROVED':
        return { name: 'account-check', color: '#2E7D32', bg: '#E8F5E9' };
      case 'JOIN_REQUEST_REJECTED':
        return { name: 'account-cancel', color: '#C62828', bg: '#FFEBEE' };
      case 'EXPENSE_EDITED':
        return { name: 'pencil', color: '#0284C7', bg: '#E0F2FE' };
      case 'PAYMENT_DECLARED':
        return { name: 'currency-inr', color: '#D97706', bg: '#FEF3C7' };
      case 'PAYMENT_APPROVED':
        return { name: 'check-circle', color: '#16A34A', bg: '#DCFCE7' };
      case 'PAYMENT_REJECTED':
        return { name: 'close-circle', color: '#DC2626', bg: '#FEE2E2' };
      case 'MEMBER_MERGED':
        return { name: 'account-switch', color: '#7C3AED', bg: '#EDE9FE' };
      default:
        return { name: 'bell', color: M3Colors.primary, bg: M3Colors.primaryContainer };
    }
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationRead(notif.id);
    }

    // Deep navigation based on notification payload
    if (notif.type === 'JOIN_REQUEST_RECEIVED') {
      router.push(`/trip/members?id=${notif.data?.tripId}` as any);
    } else if (notif.type === 'PAYMENT_DECLARED' || notif.type === 'PAYMENT_APPROVED') {
      router.push('/trip/settle' as any);
    } else if (notif.data?.tripId) {
      router.push(`/trip/${notif.data.tripId}` as any);
    }
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Notifications"
        showBack
        onBackPress={() => router.back()}
        rightAction={
          <View style={styles.topRightActions}>
            {unreadNotificationsCount > 0 && (
              <TouchableOpacity
                onPress={markAllNotificationsRead}
                style={styles.markAllBtn}
                accessibilityLabel="Mark all as read"
              >
                <Text style={styles.markAllText}>Mark read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => playNotificationSound()}
              style={styles.soundTestIconBtn}
              accessibilityLabel="Test notification sound"
            >
              <MaterialCommunityIcons name="bell-ring-outline" size={20} color={M3Colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sound Settings Card */}
        <View style={styles.soundCard}>
          <View style={styles.soundCardLeft}>
            <View
              style={[
                styles.soundCardIconCircle,
                { backgroundColor: soundOn ? M3Colors.primaryContainer : M3Colors.surfaceContainerHigh },
              ]}
            >
              <MaterialCommunityIcons
                name={soundOn ? 'volume-high' : 'volume-off'}
                size={22}
                color={soundOn ? M3Colors.primary : M3Colors.outline}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.soundCardTitle}>Notification Sound</Text>
              <Text style={styles.soundCardSubtitle}>
                {soundOn ? 'Plays a gentle chime on payments & alerts' : 'Notification sounds are muted'}
              </Text>
            </View>
          </View>

          <View style={styles.soundCardRight}>
            {soundOn && (
              <TouchableOpacity
                onPress={() => playNotificationSound()}
                style={styles.testChimeBtn}
                activeOpacity={0.7}
                accessibilityLabel="Play chime preview"
              >
                <MaterialCommunityIcons name="play" size={14} color={M3Colors.primary} />
                <Text style={styles.testChimeText}>Test</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleToggleSound}
              style={[styles.toggleBtn, soundOn && styles.toggleBtnActive]}
              activeOpacity={0.8}
              accessibilityLabel={soundOn ? 'Mute notification sound' : 'Unmute notification sound'}
            >
              <Text style={[styles.toggleBtnText, soundOn && styles.toggleBtnTextActive]}>
                {soundOn ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="bell-outline" size={48} color={M3Colors.onSurfaceVariant} />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptySubtitle}>
              You have no notifications right now. Join requests, payment declarations, and expense updates will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((notif) => {
            const iconConfig = getNotificationIcon(notif.type);
            return (
              <TouchableOpacity
                key={notif.id}
                style={[
                  styles.notificationCard,
                  !notif.isRead && styles.notificationCardUnread,
                ]}
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
                  <MaterialCommunityIcons
                    name={iconConfig.name as any}
                    size={22}
                    color={iconConfig.color}
                  />
                </View>

                <View style={styles.contentCol}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.titleText, !notif.isRead && styles.titleTextUnread]}>
                      {notif.title}
                    </Text>
                    {!notif.isRead && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.messageText}>{notif.message}</Text>

                  <Text style={styles.timestampText}>
                    {new Date(notif.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: M3Colors.surface,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundTestIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  soundCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  soundCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundCardTitle: {
    ...M3Typography.titleSmall,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  soundCardSubtitle: {
    ...M3Typography.labelSmall,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  soundCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  testChimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.primaryContainer,
  },
  testChimeText: {
    ...M3Typography.labelSmall,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  toggleBtnActive: {
    backgroundColor: M3Colors.primary,
  },
  toggleBtnText: {
    ...M3Typography.labelSmall,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '700',
  },
  toggleBtnTextActive: {
    color: M3Colors.onPrimary,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.primaryContainer,
  },
  markAllText: {
    ...M3Typography.labelSmall,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: M3Shapes.spacing.md,
    gap: 10,
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  notificationCardUnread: {
    backgroundColor: M3Colors.surface,
    borderColor: M3Colors.primaryContainer,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleText: {
    ...M3Typography.titleSmall,
    color: M3Colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  titleTextUnread: {
    fontWeight: '800',
    color: M3Colors.onSurface,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: M3Colors.primary,
  },
  messageText: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    marginTop: 3,
    lineHeight: 18,
  },
  timestampText: {
    ...M3Typography.labelSmall,
    color: M3Colors.outline,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: M3Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...M3Typography.titleLarge,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
