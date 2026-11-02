import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrips } from '../src/context/TripContext';
import { useAuth } from '../src/context/AuthContext';
import { TopAppBar } from '../src/components/common/TopAppBar';
import { ExpenseTile } from '../src/components/expense/ExpenseTile';
import { StatusBadge } from '../src/components/common/StatusBadge';
import { formatCurrency } from '../src/services/currency/exchangeRateService';
import { M3Colors } from '../src/theme/colors';
import { M3Typography } from '../src/theme/typography';
import { M3Shapes } from '../src/theme/shapes';
import { safeGoBack } from '../src/utils/navigation';

export default function MyDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { trips, activeTrip, expenses, payments, memberBalances, currentMemberRole } = useTrips();

  const [activeTab, setActiveTab] = useState<'paid' | 'shares' | 'settlements'>('paid');

  // Identify member across trips or in active trip
  const currentMember = useMemo(() => {
    if (!activeTrip || !user) return null;
    return (
      activeTrip.members.find(
        (m) => m.userId === user.id || (user.email && m.email === user.email)
      ) || activeTrip.members[0]
    );
  }, [activeTrip, user]);

  const memberId = currentMember?.id;
  const baseCurrency = activeTrip?.baseCurrency || 'INR';

  // Personal Balance
  const myBalance = useMemo(() => {
    if (!memberId) return { totalPaid: 0, totalShare: 0, netBalance: 0 };
    const bal = memberBalances.find((b) => b.memberId === memberId);
    return bal || { totalPaid: 0, totalShare: 0, netBalance: 0 };
  }, [memberBalances, memberId]);

  // Expenses paid by this user
  const myPaidExpenses = useMemo(() => {
    if (!memberId) return [];
    return expenses.filter((e) => e.paidByMemberId === memberId);
  }, [expenses, memberId]);

  // Expenses where this user is a participant
  const mySharedExpenses = useMemo(() => {
    if (!memberId) return [];
    return expenses.filter((e) => e.shares && (e.shares[memberId] || 0) > 0);
  }, [expenses, memberId]);

  // Settlements involving this user
  const mySettlements = useMemo(() => {
    if (!memberId) return [];
    return payments.filter(
      (p) =>
        p.fromMemberId === memberId ||
        p.toMemberId === memberId ||
        p.payerUid === user?.id ||
        p.receiverUid === user?.id
    );
  }, [payments, memberId, user]);

  const totalPaid = myBalance.totalPaid;
  const totalShare = myBalance.totalShare;
  const netBalance = myBalance.netBalance;

  return (
    <View style={styles.container}>
      <TopAppBar
        title="My Financial Dashboard"
        subtitle={activeTrip?.title || 'TripSplit'}
        showBack
        fallbackRoute="/(tabs)"
        onBackPress={() => safeGoBack(router, '/(tabs)')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user?.fullName || currentMember?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.identityCol}>
            <View style={styles.identityNameRow}>
              <Text style={styles.identityName}>
                {user?.fullName || currentMember?.name || 'My Account'}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{currentMemberRole}</Text>
              </View>
            </View>
            <Text style={styles.identitySub}>{user?.email || 'Authenticated Member'}</Text>
            {user?.upiId ? (
              <Text style={styles.identityUpi}>UPI: {user.upiId}</Text>
            ) : null}
          </View>
        </View>

        {/* Hero Financial Summary */}
        <View
          style={[
            styles.heroCard,
            netBalance > 0
              ? styles.heroCardPositive
              : netBalance < 0
              ? styles.heroCardNegative
              : styles.heroCardNeutral,
          ]}
        >
          <Text style={styles.heroLabel}>YOUR NET BALANCE</Text>
          <Text
            style={[
              styles.heroAmount,
              netBalance > 0
                ? styles.heroTextPositive
                : netBalance < 0
                ? styles.heroTextNegative
                : styles.heroTextNeutral,
            ]}
          >
            {netBalance > 0 ? '+' : ''}
            {formatCurrency(netBalance, baseCurrency)}
          </Text>
          <Text style={styles.heroSubText}>
            {netBalance > 0
              ? 'You are owed this amount across group expenses.'
              : netBalance < 0
              ? 'You owe this amount to settle your group share.'
              : 'You are completely settled up!'}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>TOTAL PAID</Text>
              <Text style={styles.statAmount}>
                {formatCurrency(totalPaid, baseCurrency)}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Text style={styles.statLabel}>YOUR SHARE</Text>
              <Text style={styles.statAmount}>
                {formatCurrency(totalShare, baseCurrency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Settle Action */}
        {netBalance < 0 && (
          <Button
            mode="contained"
            icon="hand-coin"
            buttonColor={M3Colors.secondary}
            textColor={M3Colors.onSecondary}
            onPress={() => router.push('/trip/settle')}
            style={styles.settleBtn}
          >
            Pay & Settle via UPI
          </Button>
        )}

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'paid' && styles.tabBtnActive]}
            onPress={() => setActiveTab('paid')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'paid' && styles.tabBtnTextActive]}>
              Paid ({myPaidExpenses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'shares' && styles.tabBtnActive]}
            onPress={() => setActiveTab('shares')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'shares' && styles.tabBtnTextActive]}>
              My Shares ({mySharedExpenses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'settlements' && styles.tabBtnActive]}
            onPress={() => setActiveTab('settlements')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'settlements' && styles.tabBtnTextActive]}>
              Settlements ({mySettlements.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'paid' && (
          <View style={styles.listSection}>
            {myPaidExpenses.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="receipt" size={40} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.emptyCardText}>No expenses paid by you yet.</Text>
              </View>
            ) : (
              myPaidExpenses.map((exp) => (
                <ExpenseTile
                  key={exp.id}
                  expense={exp}
                  currentUserId={memberId}
                  payerName={user?.fullName || 'You'}
                  onPress={() => router.push(`/trip/${exp.tripId}` as any)}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'shares' && (
          <View style={styles.listSection}>
            {mySharedExpenses.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="account-group" size={40} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.emptyCardText}>No shared expenses found for your account.</Text>
              </View>
            ) : (
              mySharedExpenses.map((exp) => {
                const payer = activeTrip?.members.find((m) => m.id === exp.paidByMemberId)?.name || 'Member';
                const myShare = exp.shares[memberId!] || 0;
                return (
                  <View key={exp.id} style={styles.sharedCard}>
                    <View style={styles.sharedCardLeft}>
                      <Text style={styles.sharedTitle}>{exp.title}</Text>
                      <Text style={styles.sharedSub}>
                        Total: {formatCurrency(exp.amount, exp.originalCurrency)} • Paid by {payer}
                      </Text>
                    </View>
                    <View style={styles.sharedCardRight}>
                      <Text style={styles.shareLabel}>YOUR SHARE</Text>
                      <Text style={styles.shareAmount}>
                        {formatCurrency(myShare, exp.originalCurrency)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'settlements' && (
          <View style={styles.listSection}>
            {mySettlements.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="shield-check" size={40} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.emptyCardText}>No settlements recorded for your account.</Text>
              </View>
            ) : (
              mySettlements.map((p) => {
                const isPayer = p.fromMemberId === memberId || p.payerUid === user?.id;
                return (
                  <View key={p.id} style={styles.settlementCard}>
                    <View style={styles.settlementTopRow}>
                      <View style={styles.settlementLeft}>
                        <MaterialCommunityIcons
                          name={isPayer ? 'arrow-top-right' : 'arrow-bottom-left'}
                          size={24}
                          color={isPayer ? M3Colors.error : M3Colors.primary}
                        />
                        <View>
                          <Text style={styles.settlementTitle}>
                            {isPayer ? `Paid to ${p.receiverName || 'Member'}` : `Received from ${p.payerName || 'Member'}`}
                          </Text>
                          <Text style={styles.settlementDate}>
                            {new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.settlementRight}>
                        <Text style={[styles.settlementAmount, isPayer ? styles.amountNeg : styles.amountPos]}>
                          {isPayer ? '-' : '+'}
                          {formatCurrency(p.amount, p.currency || baseCurrency)}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            p.status === 'APPROVED' || p.status === 'PAID'
                              ? styles.statusApproved
                              : p.status === 'REJECTED'
                              ? styles.statusRejected
                              : styles.statusPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              p.status === 'APPROVED' || p.status === 'PAID'
                                ? styles.statusTextApproved
                                : p.status === 'REJECTED'
                                ? styles.statusTextRejected
                                : styles.statusTextPending,
                            ]}
                          >
                            {p.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
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
    gap: 12,
    paddingBottom: 40,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...M3Typography.titleMedium,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  identityCol: {
    flex: 1,
  },
  identityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identityName: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  roleBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  identitySub: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    marginTop: 1,
  },
  identityUpi: {
    ...M3Typography.bodySmall,
    color: M3Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  heroCard: {
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 2,
  },
  heroCardPositive: {
    backgroundColor: '#E8F5E9',
  },
  heroCardNegative: {
    backgroundColor: '#FFEBEE',
  },
  heroCardNeutral: {
    backgroundColor: M3Colors.surfaceContainerLow,
  },
  heroLabel: {
    ...M3Typography.labelSmall,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroAmount: {
    ...M3Typography.headlineLarge,
    fontWeight: '800',
    marginTop: 4,
  },
  heroTextPositive: {
    color: '#2E7D32',
  },
  heroTextNegative: {
    color: '#C62828',
  },
  heroTextNeutral: {
    color: M3Colors.onSurface,
  },
  heroSubText: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statCol: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  statAmount: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  settleBtn: {
    borderRadius: M3Shapes.pill,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.pill,
    padding: 4,
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: M3Shapes.pill,
  },
  tabBtnActive: {
    backgroundColor: M3Colors.surface,
    elevation: 1,
  },
  tabBtnText: {
    ...M3Typography.labelMedium,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: M3Colors.primary,
    fontWeight: '700',
  },
  listSection: {
    gap: 8,
  },
  sharedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: M3Shapes.spacing.md,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
  },
  sharedTitle: {
    ...M3Typography.titleSmall,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  sharedSub: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  sharedCardLeft: {
    flex: 1,
  },
  sharedCardRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  shareLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  shareAmount: {
    ...M3Typography.titleSmall,
    color: M3Colors.onSurface,
    fontWeight: '700',
    marginTop: 1,
  },
  settlementCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
  },
  settlementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settlementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settlementTitle: {
    ...M3Typography.titleSmall,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  settlementDate: {
    ...M3Typography.labelSmall,
    color: M3Colors.outline,
    marginTop: 2,
  },
  settlementRight: {
    alignItems: 'flex-end',
  },
  settlementAmount: {
    ...M3Typography.titleSmall,
    fontWeight: '700',
  },
  amountPos: {
    color: '#2E7D32',
  },
  amountNeg: {
    color: '#C62828',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
    marginTop: 4,
  },
  statusApproved: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusRejected: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextApproved: {
    color: '#2E7D32',
  },
  statusTextPending: {
    color: '#E65100',
  },
  statusTextRejected: {
    color: '#C62828',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    gap: 8,
  },
  emptyCardText: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
  },
});
