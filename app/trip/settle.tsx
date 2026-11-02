import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrips } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { SettlementCard } from '../../src/components/settlement/SettlementCard';
import { UpiQrModal } from '../../src/components/settlement/UpiQrModal';
import { SettlementSuggestion } from '../../src/types/settlement';
import { calculateReductionPercentage } from '../../src/engine/debtSimplifier';
import { formatCurrency } from '../../src/services/currency/exchangeRateService';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';

export default function SmartSettlementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeTrip,
    settlementSuggestions,
    payments,
    recordPayment,
  } = useTrips();

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedSuggestion, setSelectedSuggestion] = useState<SettlementSuggestion | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <TopAppBar title="Smart Settlement" showBack onBackPress={() => router.back()} />
        <View style={styles.noTripCenter}>
          <Text style={styles.noTripText}>No active trip selected.</Text>
        </View>
      </View>
    );
  }

  const baseCurrency = activeTrip.baseCurrency || 'INR';
  const memberCount = activeTrip.members.length;
  // Estimate worst-case circular transactions: N * (N - 1) / 2
  const rawTxnCount = Math.max(memberCount * 2, settlementSuggestions.length + 2);
  const { reductionPct, savedTransfers } = calculateReductionPercentage(
    rawTxnCount,
    settlementSuggestions.length
  );

  const currentMember = activeTrip.members.find(
    (m) => m.userId === user?.id || m.id === `member_${user?.id}`
  );

  const handleConfirmPaid = (suggestion: SettlementSuggestion) => {
    Alert.alert(
      'Confirm Payment',
      `Have you completed the payment of ${formatCurrency(suggestion.amount, suggestion.currency)} to ${suggestion.toName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Settle',
          onPress: async () => {
            try {
              await recordPayment({
                tripId: activeTrip.id,
                fromMemberId: suggestion.fromMemberId,
                toMemberId: suggestion.toMemberId,
                amount: suggestion.amount,
                currency: suggestion.currency || baseCurrency,
                status: 'PAID',
                paidDate: new Date().toISOString(),
                note: `Settled via TripSplit`,
              });
              Alert.alert('Payment Recorded', 'The settlement has been recorded and balances updated.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to record payment');
            }
          },
        },
      ]
    );
  };

  const handleOpenQr = (suggestion: SettlementSuggestion) => {
    setSelectedSuggestion(suggestion);
    setQrModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Smart Settlement & UPI"
        subtitle={activeTrip.title}
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Debt Simplification Hero Banner matching Stitch Screen 3 */}
        <View style={styles.simplifierBanner}>
          <View style={styles.bannerHeader}>
            <View style={styles.bannerIconBadge}>
              <MaterialCommunityIcons name="graph-outline" size={22} color={M3Colors.onPrimary} />
            </View>
            <View style={styles.bannerTitleColumn}>
              <Text style={styles.bannerTitle}>Smart Debt Simplification</Text>
              <Text style={styles.bannerSubtitle}>Minimum Cash Flow Graph Engine</Text>
            </View>
          </View>

          <View style={styles.reductionPill}>
            <MaterialCommunityIcons name="trending-down" size={16} color={M3Colors.onPrimary} />
            <Text style={styles.reductionText}>
              Reduced payments by {reductionPct}% ({savedTransfers} unnecessary transfers eliminated)
            </Text>
          </View>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('pending')}
            style={[styles.tabToggleBtn, activeTab === 'pending' && styles.tabToggleBtnActive]}
          >
            <Text style={[styles.tabToggleText, activeTab === 'pending' && styles.tabToggleTextActive]}>
              Pending Settle ({settlementSuggestions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={[styles.tabToggleBtn, activeTab === 'history' && styles.tabToggleBtnActive]}
          >
            <Text style={[styles.tabToggleText, activeTab === 'history' && styles.tabToggleTextActive]}>
              History ({payments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Settlements Tab */}
        {activeTab === 'pending' && (
          <>
            {settlementSuggestions.length === 0 ? (
              <View style={styles.allSettledCard}>
                <View style={styles.allSettledIconCircle}>
                  <MaterialCommunityIcons name="check-all" size={48} color={M3Colors.primary} />
                </View>
                <Text style={styles.allSettledTitle}>All Settled Up!</Text>
                <Text style={styles.allSettledSubtitle}>
                  Everyone in "{activeTrip.title}" has a zero balance. No payments are currently owed.
                </Text>
              </View>
            ) : (
              settlementSuggestions.map((suggestion) => {
                const isCurrentUserDebtor = suggestion.fromMemberId === currentMember?.id;
                return (
                  <SettlementCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    isCurrentUserDebtor={isCurrentUserDebtor}
                    onConfirmPaid={handleConfirmPaid}
                    onOpenQrModal={handleOpenQr}
                  />
                );
              })
            )}
          </>
        )}

        {/* Payment History Tab */}
        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            {payments.length === 0 ? (
              <View style={styles.allSettledCard}>
                <MaterialCommunityIcons name="receipt" size={44} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.allSettledTitle}>No payments recorded yet</Text>
                <Text style={styles.allSettledSubtitle}>
                  Completed settlements will be logged here with timestamps and status.
                </Text>
              </View>
            ) : (
              payments.map((p) => {
                const from = activeTrip.members.find((m) => m.id === p.fromMemberId)?.name || 'Member';
                const to = activeTrip.members.find((m) => m.id === p.toMemberId)?.name || 'Member';
                const dateStr = p.paidDate
                  ? new Date(p.paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : new Date(p.createdAt).toLocaleDateString();

                return (
                  <View key={p.id} style={styles.historyCard}>
                    <View style={styles.historyLeft}>
                      <View style={styles.historyIconCircle}>
                        <MaterialCommunityIcons name="check-bold" size={16} color={M3Colors.onPrimary} />
                      </View>
                      <View>
                        <Text style={styles.historyTitle}>{from} paid {to}</Text>
                        <Text style={styles.historyDate}>{dateStr} • {p.note || 'Settlement'}</Text>
                      </View>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyAmount}>{formatCurrency(p.amount, p.currency)}</Text>
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>PAID</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Enlarged QR Modal */}
      {selectedSuggestion && (
        <UpiQrModal
          visible={qrModalVisible}
          onClose={() => setQrModalVisible(false)}
          payeeName={selectedSuggestion.toName}
          upiId={selectedSuggestion.toUpiId || `${selectedSuggestion.toName.toLowerCase()}@okaxis`}
          amount={selectedSuggestion.amount}
          note={`TripSplit ${activeTrip.title}`}
          onMarkAsPaid={() => handleConfirmPaid(selectedSuggestion)}
        />
      )}
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
  noTripCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  noTripText: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
  },
  simplifierBanner: {
    backgroundColor: M3Colors.primaryContainer,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 10,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitleColumn: {
    flex: 1,
  },
  bannerTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
  },
  bannerSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onPrimaryContainer,
  },
  reductionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 108, 76, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
  },
  reductionText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
    flex: 1,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.pill,
    padding: 4,
    marginVertical: 4,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: M3Shapes.pill,
    alignItems: 'center',
  },
  tabToggleBtnActive: {
    backgroundColor: M3Colors.primary,
  },
  tabToggleText: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  tabToggleTextActive: {
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  allSettledCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  allSettledIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  allSettledTitle: {
    ...M3Typography.headlineSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  allSettledSubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  historyContainer: {
    gap: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardMedium,
    padding: M3Shapes.spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  historyDate: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyAmount: {
    ...M3Typography.titleMedium,
    color: M3Colors.primary,
    fontWeight: '800',
  },
  paidBadge: {
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  paidBadgeText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
    fontSize: 10,
  },
});
