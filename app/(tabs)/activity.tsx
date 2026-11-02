import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrips } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { ActivityAction } from '../../src/types/activity';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { formatCurrency } from '../../src/services/currency/exchangeRateService';

function getActivityIcon(action: ActivityAction): { icon: any; color: string; bg: string } {
  switch (action) {
    case 'EXPENSE_ADDED':
      return { icon: 'plus-circle', color: M3Colors.primary, bg: M3Colors.primaryContainer };
    case 'EXPENSE_DELETED':
      return { icon: 'trash-can', color: M3Colors.error, bg: M3Colors.errorContainer };
    case 'PAYMENT_RECORDED':
    case 'SETTLEMENT_UPDATED':
      return { icon: 'hand-coin', color: M3Colors.tertiary, bg: M3Colors.tertiaryContainer };
    case 'PAYMENT_DECLARED':
      return { icon: 'clock-alert-outline', color: '#E65100', bg: '#FFE0B2' };
    case 'PAYMENT_APPROVED':
      return { icon: 'check-decagram', color: M3Colors.primary, bg: M3Colors.primaryContainer };
    case 'PAYMENT_REJECTED':
      return { icon: 'close-circle-outline', color: M3Colors.error, bg: M3Colors.errorContainer };
    case 'MEMBER_ADDED':
      return { icon: 'account-plus', color: M3Colors.secondary, bg: M3Colors.secondaryContainer };
    case 'MEMBER_REMOVED':
      return { icon: 'account-minus', color: M3Colors.onSurfaceVariant, bg: M3Colors.surfaceContainerHigh };
    case 'TRIP_CREATED':
    default:
      return { icon: 'wallet-travel', color: M3Colors.primary, bg: M3Colors.primaryContainer };
  }
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ActivityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activities, activeTrip } = useTrips();

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Activity Timeline"
        subtitle={activeTrip ? `${activeTrip.title} • History` : 'Audit Log'}
        onProfilePress={() => router.push('/(tabs)/profile')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={56} color={M3Colors.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySubtitle}>
              New expenses, member updates, and settlements will appear in this timeline.
            </Text>
          </View>
        ) : (
          activities.map((item, index) => {
            const meta = getActivityIcon(item.action);
            return (
              <View key={item.id} style={styles.timelineRow}>
                {/* Timeline Node & Line */}
                <View style={styles.timelineLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                    <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  {index < activities.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Timeline Content Card */}
                <View style={styles.contentCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.userNameText}>{item.userName || 'Member'}</Text>
                    <Text style={styles.timeText}>{formatRelativeTime(item.timestamp)}</Text>
                  </View>

                  <Text style={styles.detailsText}>{item.details}</Text>

                  {item.amount !== undefined && item.amount > 0 && (
                    <View style={styles.amountPill}>
                      <Text style={styles.amountText}>
                        {formatCurrency(item.amount, item.currency || 'INR')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
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
  scrollContent: {
    padding: M3Shapes.spacing.md,
    paddingBottom: 96,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 8,
  },
  emptyTitle: {
    ...M3Typography.titleMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
    width: 36,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: M3Colors.outlineVariant,
    marginVertical: 4,
  },
  contentCard: {
    flex: 1,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardMedium,
    padding: M3Shapes.spacing.md,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userNameText: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  timeText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
  },
  detailsText: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
  },
  amountPill: {
    alignSelf: 'flex-start',
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
    marginTop: 8,
  },
  amountText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
});
