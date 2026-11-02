import React, { useMemo, useState } from 'react';
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
import { BentoSummaryCards } from '../../src/components/analytics/BentoSummaryCards';
import {
  SpendingCharts,
  CategorySpendItem,
  MemberSpendItem,
  DailySpendItem,
} from '../../src/components/analytics/SpendingCharts';
import { getCategoryById } from '../../src/constants/categories';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeTrip, expenses, memberBalances, totalTripSpend } = useTrips();

  const [filterPeriod, setFilterPeriod] = useState<string>('trip');

  const baseCurrency = activeTrip?.baseCurrency || 'INR';

  // 1. Filter expenses based on period selection
  const filteredExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    switch (filterPeriod) {
      case '7days': {
        const cutoff = now - 7 * oneDayMs;
        return expenses.filter((e) => e.createdAt >= cutoff);
      }
      case 'month': {
        const cutoff = now - 30 * oneDayMs;
        return expenses.filter((e) => e.createdAt >= cutoff);
      }
      case 'trip':
      case 'all':
      default:
        return expenses;
    }
  }, [expenses, filterPeriod]);

  // 2. Metrics calculation
  const totalSpend = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.convertedAmount ?? e.amount), 0);
  }, [filteredExpenses]);

  // Top Spender
  const topSpender = useMemo(() => {
    if (!memberBalances || memberBalances.length === 0) {
      return { name: 'None', amount: 0, percentage: 0 };
    }
    const sorted = [...memberBalances].sort((a, b) => b.totalPaid - a.totalPaid);
    const top = sorted[0];
    const percentage = totalSpend > 0 ? Math.round((top.totalPaid / totalSpend) * 100) : 0;
    return {
      name: top.name,
      amount: top.totalPaid,
      percentage,
    };
  }, [memberBalances, totalSpend]);

  // Trip duration & daily averages
  const tripDaysCount = useMemo(() => {
    if (!activeTrip?.startDate) return 5;
    try {
      const start = new Date(activeTrip.startDate).getTime();
      const end = activeTrip.endDate ? new Date(activeTrip.endDate).getTime() : Date.now();
      const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      return diffDays;
    } catch {
      return 5;
    }
  }, [activeTrip?.startDate, activeTrip?.endDate]);

  const dailyAverage = totalSpend > 0 ? totalSpend / tripDaysCount : 0;
  const memberCount = activeTrip?.members.length || 1;
  const perPersonDailyAverage = dailyAverage / Math.max(1, memberCount);

  // 3. Category Breakdown Data
  const categorySpends = useMemo((): CategorySpendItem[] => {
    if (filteredExpenses.length === 0) return [];

    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const cat = e.categoryId || 'other';
      const amt = e.convertedAmount ?? e.amount;
      map[cat] = (map[cat] || 0) + amt;
    });

    return Object.entries(map)
      .map(([catId, amount]) => {
        const info = getCategoryById(catId);
        const percentage = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
        return {
          categoryId: catId,
          categoryName: info.name,
          icon: info.icon,
          color: info.color,
          amount,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalSpend]);

  // 4. Member Contributions Data
  const memberSpends = useMemo((): MemberSpendItem[] => {
    if (!memberBalances || memberBalances.length === 0) return [];
    return memberBalances.map((m) => ({
      memberId: m.memberId,
      name: m.name,
      amount: m.totalPaid,
    }));
  }, [memberBalances]);

  // 5. Daily Trend Data
  const dailySpends = useMemo((): DailySpendItem[] => {
    if (filteredExpenses.length === 0) return [];

    const dateMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      let dateKey = 'Recent';
      if (e.expenseDate) {
        // Formatted date (e.g. "Oct 12")
        const parts = e.expenseDate.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      }
      dateMap[dateKey] = (dateMap[dateKey] || 0) + (e.convertedAmount ?? e.amount);
    });

    return Object.entries(dateMap).map(([date, amount]) => ({
      date,
      amount,
    }));
  }, [filteredExpenses]);

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Analytics & Breakdown"
        subtitle={activeTrip ? `${activeTrip.title} • Insights` : 'TripSplit Insights'}
        onProfilePress={() => router.push('/(tabs)/profile')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!activeTrip ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chart-box-outline" size={56} color={M3Colors.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>No Active Trip Selected</Text>
            <Text style={styles.emptySubtitle}>
              Select or create a trip to see spending analytics, category breakdowns and member statistics.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/trips')}
              style={styles.selectTripBtn}
            >
              <Text style={styles.selectTripText}>View Trips</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Bento Summary Cards matching Stitch Screen 4 */}
            <BentoSummaryCards
              totalSpend={totalSpend}
              currency={baseCurrency}
              topSpenderName={topSpender.name}
              topSpenderAmount={topSpender.amount}
              topSpenderPercentage={topSpender.percentage}
              dailyAverage={dailyAverage}
              perPersonDailyAverage={perPersonDailyAverage}
              tripDaysCount={tripDaysCount}
            />

            {/* Interactive Charts & Time Period Filter */}
            <SpendingCharts
              categorySpends={categorySpends}
              memberSpends={memberSpends}
              dailySpends={dailySpends}
              currency={baseCurrency}
              onFilterChange={setFilterPeriod}
            />
          </>
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
  selectTripBtn: {
    backgroundColor: M3Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: M3Shapes.pill,
    marginTop: 12,
  },
  selectTripText: {
    ...M3Typography.labelMd,
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
});
