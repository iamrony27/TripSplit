import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';
import { formatCurrency } from '../../services/currency/exchangeRateService';

interface BentoSummaryCardsProps {
  totalSpend: number;
  currency?: string;
  topSpenderName: string;
  topSpenderAmount: number;
  topSpenderPercentage: number;
  dailyAverage: number;
  perPersonDailyAverage: number;
  tripDaysCount?: number;
}

export const BentoSummaryCards: React.FC<BentoSummaryCardsProps> = ({
  totalSpend,
  currency = 'INR',
  topSpenderName,
  topSpenderAmount,
  topSpenderPercentage,
  dailyAverage,
  perPersonDailyAverage,
  tripDaysCount = 5,
}) => {
  return (
    <View style={styles.container}>
      {/* Total Spend Hero Bento Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroLabel}>TOTAL TRIP SPEND</Text>
            <Text style={styles.heroAmount}>{formatCurrency(totalSpend, currency)}</Text>
          </View>
          <View style={styles.heroIconCircle}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color={M3Colors.primary} />
          </View>
        </View>

        <View style={styles.heroBottomRow}>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="trending-up" size={14} color={M3Colors.primary} />
            <Text style={styles.heroBadgeText}>Calculated Live Across All Members</Text>
          </View>
        </View>
      </View>

      {/* Two Column Grid for Sub-metrics */}
      <View style={styles.subGrid}>
        {/* Top Contributor */}
        <View style={styles.subCard}>
          <View style={styles.subCardHeader}>
            <Text style={styles.subCardLabel}>TOP SPENDER</Text>
            <View style={[styles.subIconBadge, { backgroundColor: M3Colors.secondaryFixed }]}>
              <MaterialCommunityIcons name="crown" size={16} color={M3Colors.onSecondaryFixed} />
            </View>
          </View>

          <Text style={styles.subCardTitle} numberOfLines={1}>
            {topSpenderName || 'None'}
          </Text>
          <Text style={[styles.subCardAmount, { color: M3Colors.secondary }]}>
            {formatCurrency(topSpenderAmount, currency)}
          </Text>
          <Text style={styles.subCardFooter}>
            {topSpenderPercentage}% of total pool
          </Text>
        </View>

        {/* Daily Average */}
        <View style={styles.subCard}>
          <View style={styles.subCardHeader}>
            <Text style={styles.subCardLabel}>DAILY AVERAGE</Text>
            <View style={[styles.subIconBadge, { backgroundColor: M3Colors.tertiaryFixed }]}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={M3Colors.onTertiaryFixed} />
            </View>
          </View>

          <Text style={styles.subCardTitle}>
            Across {tripDaysCount} Days
          </Text>
          <Text style={[styles.subCardAmount, { color: M3Colors.tertiary }]}>
            {formatCurrency(dailyAverage, currency)}
          </Text>
          <Text style={styles.subCardFooter}>
            {formatCurrency(perPersonDailyAverage, currency)} / person / day
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: M3Shapes.spacing.sm,
    marginVertical: M3Shapes.spacing.xs,
  },
  heroCard: {
    backgroundColor: M3Colors.primaryContainer,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    letterSpacing: 1,
    fontWeight: '700',
  },
  heroAmount: {
    ...M3Typography.headlineLg,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
    marginTop: 4,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 108, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottomRow: {
    marginTop: M3Shapes.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 108, 76, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: M3Shapes.pill,
  },
  heroBadgeText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  subGrid: {
    flexDirection: 'row',
    gap: M3Shapes.spacing.sm,
  },
  subCard: {
    flex: 1,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.md,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subCardLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCardTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  subCardAmount: {
    ...M3Typography.headlineSm,
    fontWeight: '800',
    marginTop: 2,
  },
  subCardFooter: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 4,
  },
});
