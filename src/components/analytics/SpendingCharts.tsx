import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';
import { SegmentedPills } from '../common/SegmentedPills';
import { formatCurrency } from '../../services/currency/exchangeRateService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 64, 340);

export interface CategorySpendItem {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  textColor?: string;
  amount: number;
  percentage: number;
}

export interface MemberSpendItem {
  memberId: string;
  name: string;
  amount: number;
}

export interface DailySpendItem {
  date: string; // e.g. 'Oct 12'
  amount: number;
}

interface SpendingChartsProps {
  categorySpends: CategorySpendItem[];
  memberSpends: MemberSpendItem[];
  dailySpends: DailySpendItem[];
  currency?: string;
  onFilterChange?: (filterId: string) => void;
}

export const SpendingCharts: React.FC<SpendingChartsProps> = ({
  categorySpends,
  memberSpends,
  dailySpends,
  currency = 'INR',
  onFilterChange,
}) => {
  const [selectedFilter, setSelectedFilter] = useState('trip');
  const [activeChartTab, setActiveChartTab] = useState<'category' | 'members' | 'daily'>('category');

  const filterOptions = [
    { value: 'trip', label: 'This Trip' },
    { value: '7days', label: '7 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  const handleFilterSelect = (val: string) => {
    setSelectedFilter(val);
    onFilterChange?.(val);
  };

  // Prepare Pie Chart Data with high-contrast text per segment
  const pieData = categorySpends.map((item) => ({
    value: item.amount,
    color: item.color || M3Colors.primary,
    text: item.percentage >= 6 ? `${item.percentage.toFixed(0)}%` : '',
    textColor: item.textColor || M3Colors.onSurface,
    textSize: 12,
    fontWeight: '800',
  }));

  // Prepare Bar Chart Data with clean first names
  const barData = memberSpends.map((item, index) => {
    const firstName = item.name.trim().split(' ')[0] || item.name;
    const cleanLabel = firstName.length > 7 ? firstName.substring(0, 6) + '…' : firstName;
    return {
      value: item.amount,
      label: cleanLabel,
      labelTextStyle: {
        color: M3Colors.onSurface,
        fontSize: 11,
        fontWeight: '600' as const,
      },
      frontColor: index % 2 === 0 ? M3Colors.primary : M3Colors.secondary,
      topLabelComponent: () => (
        <Text style={styles.chartBarLabel}>
          {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : Math.round(item.amount)}
        </Text>
      ),
    };
  });

  // Prepare Line Chart Data
  const lineData = dailySpends.map((item) => ({
    value: item.amount,
    label: item.date,
    dataPointText: item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : `${Math.round(item.amount)}`,
  }));

  return (
    <View style={styles.container}>
      {/* Time Filter Pills */}
      <View style={styles.filterWrapper}>
        <SegmentedPills
          options={filterOptions}
          selectedValue={selectedFilter}
          onSelect={handleFilterSelect}
        />
      </View>

      {/* Chart Selector Tabs */}
      <View style={styles.chartTabs}>
        <View style={styles.tabButtonsRow}>
          <Text
            onPress={() => setActiveChartTab('category')}
            style={[
              styles.chartTabBtn,
              activeChartTab === 'category' && styles.chartTabBtnActive,
            ]}
          >
            Categories
          </Text>
          <Text
            onPress={() => setActiveChartTab('members')}
            style={[
              styles.chartTabBtn,
              activeChartTab === 'members' && styles.chartTabBtnActive,
            ]}
          >
            By Member
          </Text>
          <Text
            onPress={() => setActiveChartTab('daily')}
            style={[
              styles.chartTabBtn,
              activeChartTab === 'daily' && styles.chartTabBtnActive,
            ]}
          >
            Daily Trend
          </Text>
        </View>
      </View>

      {/* Chart Canvas Card */}
      <View style={styles.chartCard}>
        {activeChartTab === 'category' && (
          <View style={styles.chartSection}>
            <Text style={styles.chartSectionTitle}>Category Breakdown</Text>
            {categorySpends.length === 0 ? (
              <View style={styles.emptyChart}>
                <MaterialCommunityIcons name="chart-donut" size={48} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.emptyText}>No category expenses recorded yet</Text>
              </View>
            ) : (
              <View style={styles.pieContainer}>
                <PieChart
                  data={pieData}
                  donut
                  radius={80}
                  innerRadius={50}
                  innerCircleColor={M3Colors.surfaceContainerLow}
                  showText
                  focusOnPress
                />
                {/* Category Legend list */}
                <View style={styles.legendContainer}>
                  {categorySpends.slice(0, 5).map((item) => (
                    <View key={item.categoryId} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendName} numberOfLines={1}>
                        {item.categoryName}
                      </Text>
                      <Text style={styles.legendAmount}>
                        {formatCurrency(item.amount, currency)} ({item.percentage.toFixed(0)}%)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {activeChartTab === 'members' && (
          <View style={styles.chartSection}>
            <Text style={styles.chartSectionTitle}>Member Contributions</Text>
            {memberSpends.length === 0 ? (
              <View style={styles.emptyChart}>
                <MaterialCommunityIcons name="chart-bar" size={48} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.emptyText}>No member spend data available</Text>
              </View>
            ) : (
              <View style={styles.barContainer}>
                <BarChart
                  data={barData}
                  width={CHART_WIDTH - 30}
                  height={180}
                  barWidth={24}
                  spacing={20}
                  roundedTop
                  roundedBottom
                  hideRules
                  yAxisThickness={0}
                  yAxisLabelWidth={44}
                  formatYLabel={(val) => {
                    const num = Number(val);
                    return isNaN(num) ? `${val}` : num >= 1000 ? `${(num / 1000).toFixed(0)}k` : `${val}`;
                  }}
                  xAxisThickness={1}
                  xAxisColor={M3Colors.outlineVariant}
                  xAxisLabelTextStyle={{
                    color: M3Colors.onSurface,
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                  yAxisTextStyle={{
                    color: M3Colors.onSurfaceVariant,
                    fontSize: 10,
                    fontWeight: '600',
                  }}
                  noOfSections={4}
                  isAnimated
                />
              </View>
            )}
          </View>
        )}

        {activeChartTab === 'daily' && (
          <View style={styles.chartSection}>
            <Text style={styles.chartSectionTitle}>Daily Spending Trend</Text>
            {dailySpends.length === 0 ? (
              <View style={styles.emptyChart}>
                <MaterialCommunityIcons name="chart-timeline-variant" size={48} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.emptyText}>No daily spend entries recorded yet</Text>
              </View>
            ) : (
              <View style={styles.lineContainer}>
                <LineChart
                  data={lineData}
                  width={CHART_WIDTH - 30}
                  height={180}
                  color={M3Colors.primary}
                  thickness={3}
                  startFillColor="rgba(0, 108, 76, 0.3)"
                  endFillColor="rgba(0, 108, 76, 0.01)"
                  areaChart
                  curved
                  hideRules
                  yAxisThickness={0}
                  yAxisLabelWidth={44}
                  formatYLabel={(val) => {
                    const num = Number(val);
                    return isNaN(num) ? `${val}` : num >= 1000 ? `${(num / 1000).toFixed(0)}k` : `${val}`;
                  }}
                  xAxisThickness={1}
                  xAxisColor={M3Colors.outlineVariant}
                  xAxisLabelTextStyle={{
                    color: M3Colors.onSurface,
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                  yAxisTextStyle={{
                    color: M3Colors.onSurfaceVariant,
                    fontSize: 10,
                    fontWeight: '600',
                  }}
                  dataPointsColor={M3Colors.primary}
                  isAnimated
                />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Detailed Category Progress Bars */}
      <View style={styles.detailedProgressCard}>
        <Text style={styles.detailedTitle}>All Categories</Text>
        {categorySpends.map((item) => (
          <View key={item.categoryId} style={styles.progressRow}>
            <View style={styles.progressHeader}>
              <View style={styles.progressLabelGroup}>
                <View style={[styles.progressIconBadge, { backgroundColor: item.color + '22' }]}>
                  <MaterialCommunityIcons name={item.icon as any || 'tag'} size={14} color={item.color} />
                </View>
                <Text style={styles.progressCategoryName}>{item.categoryName}</Text>
              </View>
              <Text style={styles.progressAmount}>{formatCurrency(item.amount, currency)}</Text>
            </View>
            {/* Progress track */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: item.color,
                    width: `${Math.min(Math.max(item.percentage, 4), 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: M3Shapes.spacing.md,
  },
  filterWrapper: {
    marginVertical: 4,
  },
  chartTabs: {
    alignItems: 'center',
    marginBottom: 4,
  },
  tabButtonsRow: {
    flexDirection: 'row',
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.pill,
    padding: 3,
  },
  chartTabBtn: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    fontWeight: '600',
  },
  chartTabBtnActive: {
    backgroundColor: M3Colors.primaryContainer,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  chartSection: {
    alignItems: 'center',
  },
  chartSectionTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  emptyChart: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
  },
  pieContainer: {
    alignItems: 'center',
    width: '100%',
  },
  legendContainer: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendName: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurface,
    flex: 1,
    fontWeight: '500',
  },
  legendAmount: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  chartBarLabel: {
    fontSize: 10,
    color: M3Colors.onSurface,
    marginBottom: 2,
    fontWeight: '700',
  },
  lineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  detailedProgressCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.md,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  detailedTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  progressRow: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCategoryName: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  progressAmount: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});
