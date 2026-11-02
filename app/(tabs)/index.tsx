import React from 'react';
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
import { useAuth } from '../../src/context/AuthContext';
import { useTrips } from '../../src/context/TripContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { AvatarStack } from '../../src/components/common/AvatarStack';
import { ExpenseTile } from '../../src/components/expense/ExpenseTile';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { formatCurrency } from '../../src/services/currency/exchangeRateService';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeTrip,
    trips,
    expenses,
    totalTripSpend,
    memberBalances,
    settlementSuggestions,
    payments,
    loading,
  } = useTrips();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // Current user's net balance within the active trip
  const currentMember = activeTrip?.members.find(
    (m) => m.userId === user?.id || m.id === `member_${user?.id}`
  );
  const currentMemberBalance = memberBalances.find(
    (b) => b.memberId === currentMember?.id
  );
  const myNetBalance = currentMemberBalance ? currentMemberBalance.netBalance : 0;

  const totalOwed = settlementSuggestions
    .filter((s) => s.fromMemberId === currentMember?.id)
    .reduce((acc, s) => acc + s.amount, 0);

  const totalReceivable = settlementSuggestions
    .filter((s) => s.toMemberId === currentMember?.id)
    .reduce((acc, s) => acc + s.amount, 0);

  const myPendingDeclarations = payments.filter(
    (p) =>
      (p.status === 'PENDING_ADMIN_APPROVAL' || p.status === 'PENDING') &&
      (p.fromMemberId === currentMember?.id ||
        p.toMemberId === currentMember?.id ||
        p.payerUid === user?.id)
  );

  const myApprovedPaymentsCount = payments.filter(
    (p) =>
      (p.status === 'APPROVED' || p.status === 'PAID') &&
      (p.fromMemberId === currentMember?.id || p.toMemberId === currentMember?.id)
  ).length;

  const baseCurrency = activeTrip?.baseCurrency || user?.defaultCurrency || 'INR';

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <TopAppBar
        title={activeTrip ? activeTrip.title : 'TripSplit'}
        subtitle={activeTrip ? `${baseCurrency} • Active Trip` : 'Group Expenses'}
        onProfilePress={() => router.push('/(tabs)/profile')}
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/trips')}
            style={styles.switchTripBtn}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={18} color={M3Colors.primary} />
            <Text style={styles.switchTripText}>Trips</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[M3Colors.primary]} />
        }
      >
        {!activeTrip ? (
          // No Active Trip State
          <View style={styles.noTripCard}>
            <View style={styles.noTripIconCircle}>
              <MaterialCommunityIcons name="wallet-travel" size={48} color={M3Colors.primary} />
            </View>
            <Text style={styles.noTripTitle}>No Active Trip Found</Text>
            <Text style={styles.noTripSubtitle}>
              Create a trip to start adding expenses, managing members, splitting bills, and tracking smart UPI settlements with cloud backup.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/trip/create')}
              style={styles.createTripBtn}
            >
              <MaterialCommunityIcons name="plus" size={20} color={M3Colors.onPrimary} />
              <Text style={styles.createTripBtnText}>Create New Trip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Hero Financial Bento Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroLabel}>TOTAL TRIP SPEND</Text>
                  <Text style={styles.heroAmount}>
                    {formatCurrency(totalTripSpend, baseCurrency)}
                  </Text>
                </View>
                <View style={styles.heroIconBadge}>
                  <MaterialCommunityIcons name="cash-multiple" size={24} color={M3Colors.primary} />
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroBottomRow}>
                <View>
                  <Text style={styles.balanceLabel}>YOUR NET BALANCE</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      myNetBalance > 0
                        ? styles.balancePositive
                        : myNetBalance < 0
                        ? styles.balanceNegative
                        : styles.balanceNeutral,
                    ]}
                  >
                    {formatCurrency(myNetBalance, baseCurrency)}
                  </Text>
                </View>
                <StatusBadge amount={myNetBalance} currency={baseCurrency} variant="expanded" />
              </View>

              <TouchableOpacity
                onPress={() => router.push('/my-dashboard' as any)}
                style={styles.myDashboardBanner}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="view-dashboard-outline" size={16} color={M3Colors.primary} />
                  <Text style={styles.myDashboardBannerText}>My Personal Expense Dashboard</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={M3Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Quick Action Pills Row */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                onPress={() => router.push('/trip/add-expense')}
                style={[styles.actionPill, styles.actionPillPrimary]}
              >
                <MaterialCommunityIcons name="plus" size={18} color={M3Colors.onPrimary} />
                <Text style={styles.actionPillTextPrimary}>Add Expense</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/trip/settle')}
                style={[styles.actionPill, styles.actionPillSecondary]}
              >
                <MaterialCommunityIcons name="hand-coin" size={18} color={M3Colors.onSecondary} />
                <Text style={styles.actionPillTextSecondary}>Settle Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/trip/create')}
                style={[styles.actionPill, styles.actionPillTertiary]}
              >
                <MaterialCommunityIcons name="wallet-plus-outline" size={18} color={M3Colors.onTertiary} />
                <Text style={styles.actionPillTextTertiary}>New Trip</Text>
              </TouchableOpacity>
            </View>

            {/* Personal Settlement Summary Card */}
            <View style={styles.settlementCard}>
              <View style={styles.settlementHeader}>
                <View style={styles.settlementHeaderLeft}>
                  <MaterialCommunityIcons name="shield-sync-outline" size={18} color={M3Colors.primary} />
                  <Text style={styles.settlementTitle}>Settlement & UPI</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/trip/settle')}
                  style={styles.settlementLinkBtn}
                >
                  <Text style={styles.settlementLinkText}>Settle Up</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={M3Colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.settlementGrid}>
                <View style={styles.settlementGridCol}>
                  <Text style={styles.settlementGridLabel}>TOTAL OWED</Text>
                  <Text style={[styles.settlementGridValue, { color: M3Colors.error }]}>
                    {formatCurrency(totalOwed, baseCurrency)}
                  </Text>
                </View>

                <View style={styles.settlementDivider} />

                <View style={styles.settlementGridCol}>
                  <Text style={styles.settlementGridLabel}>RECEIVABLE</Text>
                  <Text style={[styles.settlementGridValue, { color: M3Colors.primary }]}>
                    {formatCurrency(totalReceivable, baseCurrency)}
                  </Text>
                </View>

                <View style={styles.settlementDivider} />

                <View style={styles.settlementGridCol}>
                  <Text style={styles.settlementGridLabel}>PENDING</Text>
                  <Text style={[styles.settlementGridValue, { color: '#E65100' }]}>
                    {myPendingDeclarations.length}
                  </Text>
                </View>

                <View style={styles.settlementDivider} />

                <View style={styles.settlementGridCol}>
                  <Text style={styles.settlementGridLabel}>APPROVED</Text>
                  <Text style={[styles.settlementGridValue, { color: M3Colors.onSurface }]}>
                    {myApprovedPaymentsCount}
                  </Text>
                </View>
              </View>

              {myPendingDeclarations.length > 0 && (
                <TouchableOpacity
                  style={styles.pendingAlertBar}
                  onPress={() => router.push('/trip/settle')}
                >
                  <MaterialCommunityIcons name="clock-alert-outline" size={15} color="#E65100" />
                  <Text style={styles.pendingAlertText}>
                    {myPendingDeclarations.length} payment awaiting Admin approval • Tap to view
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Active Trip Overview Card */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/trip/[id]', params: { id: activeTrip.id } })}
              style={styles.tripOverviewCard}
              activeOpacity={0.8}
            >
              <View style={styles.tripCardLeft}>
                <Text style={styles.tripCardTitle} numberOfLines={1}>
                  {activeTrip.title}
                </Text>
                <Text style={styles.tripCardSubtitle}>
                  {activeTrip.startDate || 'Ongoing'} • {activeTrip.members.length} Members
                </Text>
              </View>
              <View style={styles.tripCardRight}>
                <AvatarStack members={activeTrip.members} maxVisible={3} size={32} />
                <MaterialCommunityIcons name="chevron-right" size={20} color={M3Colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>

            {/* Recent Expenses Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Recent Expenses</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{expenses.length}</Text>
                </View>
              </View>
              {expenses.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/trip/[id]', params: { id: activeTrip.id } })}
                >
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Expenses List */}
            {expenses.length === 0 ? (
              <View style={styles.emptyExpensesCard}>
                <MaterialCommunityIcons name="receipt" size={36} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.emptyExpensesTitle}>No expenses recorded yet</Text>
                <Text style={styles.emptyExpensesSubtitle}>
                  Tap "+ Add Expense" to record meals, travel, hotels and split with friends.
                </Text>
              </View>
            ) : (
              expenses.slice(0, 6).map((item) => {
                const payer = activeTrip.members.find((m) => m.id === item.paidByMemberId)?.name;
                return (
                  <ExpenseTile
                    key={item.id}
                    expense={item}
                    currentUserId={currentMember?.id}
                    payerName={payer}
                    onPress={() => router.push('/trip/add-expense')}
                  />
                );
              })
            )}
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
  switchTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
  },
  switchTripText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  noTripCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  noTripIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noTripTitle: {
    ...M3Typography.headlineSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  noTripSubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  createTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: M3Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: M3Shapes.pill,
  },
  createTripBtnText: {
    ...M3Typography.labelLg,
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: M3Colors.primaryContainer,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
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
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 108, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 33, 20, 0.12)',
    marginVertical: 14,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  balanceAmount: {
    ...M3Typography.titleLg,
    fontWeight: '800',
    marginTop: 2,
  },
  balancePositive: {
    color: M3Colors.primary,
  },
  balanceNegative: {
    color: M3Colors.debit,
  },
  balanceNeutral: {
    color: M3Colors.onPrimaryContainer,
  },
  myDashboardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: M3Shapes.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },
  myDashboardBannerText: {
    ...M3Typography.labelSmall,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: M3Shapes.spacing.md,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: M3Shapes.pill,
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionPillPrimary: {
    backgroundColor: M3Colors.primary,
  },
  actionPillTextPrimary: {
    ...M3Typography.labelMd,
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  actionPillSecondary: {
    backgroundColor: M3Colors.secondary,
  },
  actionPillTextSecondary: {
    ...M3Typography.labelMd,
    color: M3Colors.onSecondary,
    fontWeight: '700',
  },
  actionPillTertiary: {
    backgroundColor: M3Colors.tertiary,
  },
  actionPillTextTertiary: {
    ...M3Typography.labelMd,
    color: M3Colors.onTertiary,
    fontWeight: '700',
  },
  tripOverviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardMedium,
    padding: M3Shapes.spacing.md,
    marginBottom: M3Shapes.spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tripCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  tripCardTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  tripCardSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  tripCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...M3Typography.titleMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: M3Colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  countBadgeText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '700',
  },
  seeAllText: {
    ...M3Typography.labelMd,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  emptyExpensesCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyExpensesTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  emptyExpensesSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  settlementCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardMedium,
    padding: M3Shapes.spacing.md,
    marginBottom: M3Shapes.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    gap: 12,
  },
  settlementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settlementHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settlementTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '800',
  },
  settlementLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  settlementLinkText: {
    ...M3Typography.labelSm,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  settlementGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  settlementGridCol: {
    flex: 1,
    alignItems: 'center',
  },
  settlementGridLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  settlementGridValue: {
    ...M3Typography.labelLarge,
    fontWeight: '800',
  },
  settlementDivider: {
    width: 1,
    height: 24,
    backgroundColor: M3Colors.outlineVariant,
    opacity: 0.5,
  },
  pendingAlertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    gap: 6,
  },
  pendingAlertText: {
    ...M3Typography.labelSm,
    color: '#E65100',
    fontWeight: '700',
    flex: 1,
    fontSize: 11,
  },
});
