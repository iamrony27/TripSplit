import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrips } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { SettlementCard } from '../../src/components/settlement/SettlementCard';
import { UpiQrModal } from '../../src/components/settlement/UpiQrModal';
import { PaymentDeclarationModal } from '../../src/components/settlement/PaymentDeclarationModal';
import { PaymentRecord, SettlementSuggestion } from '../../src/types/settlement';
import { calculateReductionPercentage } from '../../src/engine/debtSimplifier';
import { formatCurrency } from '../../src/services/currency/exchangeRateService';
import { launchUpiPayment } from '../../src/services/upi/upiLauncher';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { safeGoBack } from '../../src/utils/navigation';

type TabType = 'settle' | 'approvals' | 'history';
type HistoryFilter = 'ALL' | 'APPROVED' | 'REJECTED';

export default function SmartSettlementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeTrip,
    settlementSuggestions,
    payments,
    recordPayment,
    declarePayment,
    approvePayment,
    rejectPayment,
    cancelPayment,
    isTripAdmin,
    currentMember,
  } = useTrips();

  const [activeTab, setActiveTab] = useState<TabType>('settle');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('ALL');

  // Modals state
  const [selectedSuggestionForQr, setSelectedSuggestionForQr] = useState<SettlementSuggestion | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const [declarationModalVisible, setDeclarationModalVisible] = useState(false);
  const [selectedSuggestionForDeclaration, setSelectedSuggestionForDeclaration] = useState<SettlementSuggestion | null>(null);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [paymentToReject, setPaymentToReject] = useState<PaymentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <TopAppBar
          title="Smart Settlement"
          showBack
          fallbackRoute="/(tabs)"
          onBackPress={() => safeGoBack(router, '/(tabs)')}
        />
        <View style={styles.noTripCenter}>
          <Text style={styles.noTripText}>No active trip selected.</Text>
        </View>
      </View>
    );
  }

  const baseCurrency = activeTrip.baseCurrency || 'INR';
  const memberCount = activeTrip.members.length;
  const rawTxnCount = Math.max(memberCount * 2, settlementSuggestions.length + 2);
  const { reductionPct, savedTransfers } = calculateReductionPercentage(
    rawTxnCount,
    settlementSuggestions.length
  );

  // Filter pending approvals
  const pendingApprovals = payments.filter(
    (p) => p.status === 'PENDING_ADMIN_APPROVAL' || p.status === 'PENDING'
  );

  // Filter history
  const historyPayments = payments.filter(
    (p) => p.status !== 'PENDING_ADMIN_APPROVAL' && p.status !== 'PENDING'
  );

  const filteredHistory = historyPayments.filter((p) => {
    if (historyFilter === 'APPROVED') {
      return p.status === 'APPROVED' || p.status === 'PAID';
    }
    if (historyFilter === 'REJECTED') {
      return p.status === 'REJECTED' || p.status === 'CANCELLED';
    }
    return true;
  });

  // Action: Launch UPI Payment
  const handlePayViaUpi = (suggestion: SettlementSuggestion) => {
    const upiId = suggestion.toUpiId || `${suggestion.toName.toLowerCase().replace(/\s+/g, '')}@okaxis`;
    launchUpiPayment({
      upiId,
      payeeName: suggestion.toName,
      amount: suggestion.amount,
      currency: suggestion.currency || baseCurrency,
      note: `TripSplit Settlement to ${suggestion.toName}`,
    });
  };

  // Action: Open Declaration Modal
  const handleOpenDeclareModal = (suggestion: SettlementSuggestion) => {
    setSelectedSuggestionForDeclaration(suggestion);
    setDeclarationModalVisible(true);
  };

  // Action: Submit Declaration
  const handleDeclareSubmit = async (params: { upiTxnId?: string; note?: string }) => {
    if (!selectedSuggestionForDeclaration) return;
    const receiverMember = activeTrip.members.find(
      (m) => m.id === selectedSuggestionForDeclaration.toMemberId
    );

    await declarePayment({
      tripId: activeTrip.id,
      groupId: activeTrip.id,
      settlementId: selectedSuggestionForDeclaration.id,
      fromMemberId: selectedSuggestionForDeclaration.fromMemberId,
      payerUid: user?.id,
      payerName: selectedSuggestionForDeclaration.fromName,
      toMemberId: selectedSuggestionForDeclaration.toMemberId,
      receiverUid: receiverMember?.userId,
      receiverName: selectedSuggestionForDeclaration.toName,
      amount: selectedSuggestionForDeclaration.amount,
      currency: selectedSuggestionForDeclaration.currency || baseCurrency,
      upiTransactionReference: params.upiTxnId,
      upiTxnId: params.upiTxnId,
      note: params.note,
      paidDate: new Date().toISOString(),
    });

    Alert.alert(
      'Payment Declared',
      'Your payment has been declared. It is now awaiting Admin approval before balances are updated.'
    );
  };

  // Action: Cancel Declaration
  const handleCancelDeclaration = (paymentId: string) => {
    Alert.alert(
      'Cancel Payment Declaration',
      'Are you sure you want to cancel this pending payment declaration?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelPayment(paymentId);
              Alert.alert('Declaration Cancelled', 'Your pending payment declaration has been cancelled.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel declaration');
            }
          },
        },
      ]
    );
  };

  // Action: Direct Settle (Admin/Receiver shortcut)
  const handleConfirmPaid = (suggestion: SettlementSuggestion) => {
    Alert.alert(
      'Direct Settlement',
      `Record that ${suggestion.fromName} paid ${formatCurrency(suggestion.amount, suggestion.currency)} to ${suggestion.toName}? This immediately updates balances.`,
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
                status: 'APPROVED',
                paidDate: new Date().toISOString(),
                note: `Direct settled by ${user?.fullName || 'Admin'}`,
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

  // Action: Admin Approve Payment
  const handleApprovePayment = (payment: PaymentRecord) => {
    const isSelfPayment =
      payment.payerUid === user?.id || payment.fromMemberId === currentMember?.id;

    if (isSelfPayment) {
      Alert.alert(
        'Self-Approval Not Allowed',
        'You declared this payment as the payer. Only another group admin or the receiving member can verify and approve it.'
      );
      return;
    }

    Alert.alert(
      'Approve Payment',
      `Confirm receipt of ${formatCurrency(payment.amount, payment.currency)} from ${payment.payerName || 'Payer'} to ${payment.receiverName || 'Receiver'}?\n\nThis will officially reduce the member's balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Settle',
          onPress: async () => {
            try {
              await approvePayment(payment.id);
              Alert.alert('Payment Approved', 'The payment is verified and balances have been updated.');
            } catch (err: any) {
              Alert.alert('Approval Error', err.message || 'Failed to approve payment.');
            }
          },
        },
      ]
    );
  };

  // Action: Admin Open Reject Dialog
  const handleOpenRejectModal = (payment: PaymentRecord) => {
    setPaymentToReject(payment);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  // Action: Admin Submit Rejection
  const handleConfirmReject = async () => {
    if (!paymentToReject) return;
    setRejecting(true);
    try {
      await rejectPayment(paymentToReject.id, rejectionReason.trim());
      setRejectModalVisible(false);
      setPaymentToReject(null);
      setRejectionReason('');
      Alert.alert('Payment Rejected', 'The declaration was rejected. The payer has been notified.');
    } catch (err: any) {
      Alert.alert('Rejection Error', err.message || 'Failed to reject payment.');
    } finally {
      setRejecting(false);
    }
  };

  const handleOpenQr = (suggestion: SettlementSuggestion) => {
    setSelectedSuggestionForQr(suggestion);
    setQrModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Settlement & UPI"
        subtitle={activeTrip.title}
        showBack
        fallbackRoute={`/trip/${activeTrip.id}`}
        onBackPress={() => safeGoBack(router, `/trip/${activeTrip.id}`)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Debt Simplification Hero Banner */}
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

        {/* 3-Tab Segmented Control */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('settle')}
            style={[styles.tabToggleBtn, activeTab === 'settle' && styles.tabToggleBtnActive]}
          >
            <Text style={[styles.tabToggleText, activeTab === 'settle' && styles.tabToggleTextActive]}>
              Settle Up ({settlementSuggestions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('approvals')}
            style={[styles.tabToggleBtn, activeTab === 'approvals' && styles.tabToggleBtnActive]}
          >
            <View style={styles.tabWithBadge}>
              <Text style={[styles.tabToggleText, activeTab === 'approvals' && styles.tabToggleTextActive]}>
                Approvals
              </Text>
              {pendingApprovals.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingApprovals.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={[styles.tabToggleBtn, activeTab === 'history' && styles.tabToggleBtnActive]}
          >
            <Text style={[styles.tabToggleText, activeTab === 'history' && styles.tabToggleTextActive]}>
              History ({historyPayments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= TAB 1: SETTLE UP ================= */}
        {activeTab === 'settle' && (
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
                const pendingDec = payments.find(
                  (p) =>
                    (p.status === 'PENDING_ADMIN_APPROVAL' || p.status === 'PENDING') &&
                    p.fromMemberId === suggestion.fromMemberId &&
                    p.toMemberId === suggestion.toMemberId
                );

                return (
                  <SettlementCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    currentMemberId={currentMember?.id}
                    currentUserId={user?.id}
                    pendingDeclaration={pendingDec}
                    onPayViaUpi={handlePayViaUpi}
                    onDeclarePaid={handleOpenDeclareModal}
                    onCancelDeclaration={handleCancelDeclaration}
                    onConfirmPaid={handleConfirmPaid}
                    onOpenQrModal={handleOpenQr}
                  />
                );
              })
            )}
          </>
        )}

        {/* ================= TAB 2: PENDING APPROVALS ================= */}
        {activeTab === 'approvals' && (
          <View style={styles.approvalsContainer}>
            {/* Info notice about admin approval process */}
            <View style={styles.adminRoleNotice}>
              <MaterialCommunityIcons
                name={isTripAdmin ? 'shield-crown-outline' : 'information-outline'}
                size={20}
                color={isTripAdmin ? M3Colors.primary : M3Colors.onSurfaceVariant}
              />
              <Text style={styles.adminRoleText}>
                {isTripAdmin
                  ? 'As Group Admin, verify your bank receipt before approving payments. Approving permanently reduces debtor balance.'
                  : 'Only the Group Admin can approve payments. Check here for pending payment verification.'}
              </Text>
            </View>

            {pendingApprovals.length === 0 ? (
              <View style={styles.allSettledCard}>
                <View style={[styles.allSettledIconCircle, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialCommunityIcons name="clock-check-outline" size={48} color="#F57C00" />
                </View>
                <Text style={styles.allSettledTitle}>No Pending Approvals</Text>
                <Text style={styles.allSettledSubtitle}>
                  All payment declarations in this group have been processed.
                </Text>
              </View>
            ) : (
              pendingApprovals.map((p) => {
                const fromName =
                  p.payerName ||
                  activeTrip.members.find((m) => m.id === p.fromMemberId)?.name ||
                  'Member';
                const toName =
                  p.receiverName ||
                  activeTrip.members.find((m) => m.id === p.toMemberId)?.name ||
                  'Member';
                const isSelfPayment =
                  p.payerUid === user?.id || p.fromMemberId === currentMember?.id;
                const dateStr = p.paidDate
                  ? new Date(p.paidDate).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : new Date(p.createdAt).toLocaleDateString();

                return (
                  <View key={p.id} style={styles.approvalCard}>
                    {/* Header */}
                    <View style={styles.approvalHeader}>
                      <View style={styles.pendingPill}>
                        <MaterialCommunityIcons name="clock-outline" size={13} color="#E65100" />
                        <Text style={styles.pendingPillText}>Pending Admin Approval</Text>
                      </View>
                      <Text style={styles.approvalDate}>{dateStr}</Text>
                    </View>

                    {/* Flow */}
                    <View style={styles.approvalFlow}>
                      <View style={styles.flowParty}>
                        <Text style={styles.flowRole}>DEBTOR (PAYER)</Text>
                        <Text style={styles.flowName}>{fromName}</Text>
                      </View>
                      <View style={styles.flowCenter}>
                        <Text style={styles.flowAmount}>
                          {formatCurrency(p.amount, p.currency)}
                        </Text>
                        <MaterialCommunityIcons name="arrow-right" size={18} color={M3Colors.primary} />
                      </View>
                      <View style={[styles.flowParty, { alignItems: 'flex-end' }]}>
                        <Text style={styles.flowRole}>CREDITOR (RECEIVER)</Text>
                        <Text style={styles.flowName}>{toName}</Text>
                      </View>
                    </View>

                    {/* Transaction Details */}
                    {(p.upiTransactionReference || p.upiTxnId || p.note) && (
                      <View style={styles.approvalMetaBox}>
                        {(p.upiTransactionReference || p.upiTxnId) && (
                          <View style={styles.metaRow}>
                            <MaterialCommunityIcons name="receipt" size={14} color={M3Colors.primary} />
                            <Text style={styles.metaLabel}>UPI Ref / UTR:</Text>
                            <Text style={styles.metaValue} selectable>
                              {p.upiTransactionReference || p.upiTxnId}
                            </Text>
                          </View>
                        )}
                        {p.note && (
                          <View style={styles.metaRow}>
                            <MaterialCommunityIcons name="note-text-outline" size={14} color={M3Colors.onSurfaceVariant} />
                            <Text style={styles.metaLabel}>Note:</Text>
                            <Text style={styles.metaValue}>{p.note}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Admin Actions */}
                    {isTripAdmin ? (
                      isSelfPayment ? (
                        <View style={styles.selfPayNotice}>
                          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#E65100" />
                          <Text style={styles.selfPayNoticeText}>
                            You declared this payment. Another admin or the receiver must verify it.
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.approvalActionsRow}>
                          <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => handleOpenRejectModal(p)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="close-circle-outline" size={16} color={M3Colors.error} />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => handleApprovePayment(p)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="check-circle" size={16} color="#FFFFFF" />
                            <Text style={styles.approveBtnText}>Approve Payment</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    ) : (
                      <View style={styles.nonAdminFooter}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={M3Colors.outline} />
                        <Text style={styles.nonAdminFooterText}>
                          Awaiting verification by Group Admin
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ================= TAB 3: PAYMENT HISTORY ================= */}
        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              {(['ALL', 'APPROVED', 'REJECTED'] as HistoryFilter[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setHistoryFilter(filter)}
                  style={[
                    styles.filterPill,
                    historyFilter === filter && styles.filterPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      historyFilter === filter && styles.filterPillTextActive,
                    ]}
                  >
                    {filter === 'ALL'
                      ? `All (${historyPayments.length})`
                      : filter === 'APPROVED'
                      ? `Approved (${historyPayments.filter((p) => p.status === 'APPROVED' || p.status === 'PAID').length})`
                      : `Rejected (${historyPayments.filter((p) => p.status === 'REJECTED' || p.status === 'CANCELLED').length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredHistory.length === 0 ? (
              <View style={styles.allSettledCard}>
                <MaterialCommunityIcons name="receipt" size={44} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.allSettledTitle}>No payments found</Text>
                <Text style={styles.allSettledSubtitle}>
                  Completed and reviewed settlements will appear here.
                </Text>
              </View>
            ) : (
              filteredHistory.map((p) => {
                const from =
                  p.payerName ||
                  activeTrip.members.find((m) => m.id === p.fromMemberId)?.name ||
                  'Member';
                const to =
                  p.receiverName ||
                  activeTrip.members.find((m) => m.id === p.toMemberId)?.name ||
                  'Member';
                const isApproved = p.status === 'APPROVED' || p.status === 'PAID';
                const isRejected = p.status === 'REJECTED';
                const isCancelled = p.status === 'CANCELLED';

                const dateStr = p.paidDate
                  ? new Date(p.paidDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : new Date(p.createdAt).toLocaleDateString();

                return (
                  <View key={p.id} style={styles.historyCard}>
                    <View style={styles.historyTopRow}>
                      <View style={styles.historyLeft}>
                        <View
                          style={[
                            styles.historyIconCircle,
                            isApproved
                              ? { backgroundColor: M3Colors.primary }
                              : isRejected
                              ? { backgroundColor: M3Colors.error }
                              : { backgroundColor: M3Colors.outline },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={
                              isApproved
                                ? 'check-bold'
                                : isRejected
                                ? 'close-thick'
                                : 'cancel'
                            }
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyTitle}>
                            {from} paid {to}
                          </Text>
                          <Text style={styles.historyDate}>{dateStr}</Text>
                        </View>
                      </View>

                      <View style={styles.historyRight}>
                        <Text
                          style={[
                            styles.historyAmount,
                            isApproved
                              ? { color: M3Colors.primary }
                              : { color: M3Colors.outline },
                          ]}
                        >
                          {formatCurrency(p.amount, p.currency)}
                        </Text>
                        <View
                          style={[
                            styles.statusBadgePill,
                            isApproved
                              ? styles.badgeApproved
                              : isRejected
                              ? styles.badgeRejected
                              : styles.badgeCancelled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgePillText,
                              isApproved
                                ? styles.badgeApprovedText
                                : isRejected
                                ? styles.badgeRejectedText
                                : styles.badgeCancelledText,
                            ]}
                          >
                            {isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'CANCELLED'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Metadata / Audit trail */}
                    <View style={styles.historyAuditBox}>
                      {(p.upiTransactionReference || p.upiTxnId) && (
                        <Text style={styles.auditText}>
                          UTR: {p.upiTransactionReference || p.upiTxnId}
                        </Text>
                      )}
                      {isApproved && p.approvedByName && (
                        <Text style={styles.auditText}>
                          Approved by {p.approvedByName}
                          {p.approvedAt ? ` on ${new Date(p.approvedAt).toLocaleDateString()}` : ''}
                        </Text>
                      )}
                      {isRejected && (
                        <Text style={[styles.auditText, { color: M3Colors.error }]}>
                          Rejected by {p.rejectedByName || 'Admin'}
                          {p.rejectionReason ? `: "${p.rejectionReason}"` : ''}
                        </Text>
                      )}
                      {p.note && <Text style={styles.auditText}>Note: {p.note}</Text>}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Enlarged QR Modal */}
      {selectedSuggestionForQr && (
        <UpiQrModal
          visible={qrModalVisible}
          onClose={() => setQrModalVisible(false)}
          payeeName={selectedSuggestionForQr.toName}
          upiId={
            selectedSuggestionForQr.toUpiId ||
            `${selectedSuggestionForQr.toName.toLowerCase()}@okaxis`
          }
          amount={selectedSuggestionForQr.amount}
          note={`TripSplit ${activeTrip.title}`}
          onMarkAsPaid={() => handleConfirmPaid(selectedSuggestionForQr)}
        />
      )}

      {/* Payment Declaration Modal (I HAVE PAID) */}
      {selectedSuggestionForDeclaration && (
        <PaymentDeclarationModal
          visible={declarationModalVisible}
          onClose={() => {
            setDeclarationModalVisible(false);
            setSelectedSuggestionForDeclaration(null);
          }}
          suggestion={selectedSuggestionForDeclaration}
          tripTitle={activeTrip.title}
          onSubmit={handleDeclareSubmit}
        />
      )}

      {/* Admin Rejection Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setRejectModalVisible(false)}
          />

          <View style={styles.rejectModalContainer}>
            <View style={styles.rejectModalHeader}>
              <MaterialCommunityIcons name="alert-octagon" size={24} color={M3Colors.error} />
              <Text style={styles.rejectModalTitle}>Reject Payment Declaration</Text>
            </View>

            <Text style={styles.rejectModalSubtitle}>
              Please provide a reason so the payer knows what to correct (e.g. money not received in bank account).
            </Text>

            {/* Quick reason suggestions */}
            <View style={styles.quickReasonsRow}>
              {[
                'Payment not received in bank',
                'Incorrect amount transferred',
                'Invalid UPI UTR reference',
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.quickReasonChip,
                    rejectionReason === reason && styles.quickReasonChipActive,
                  ]}
                  onPress={() => setRejectionReason(reason)}
                >
                  <Text
                    style={[
                      styles.quickReasonText,
                      rejectionReason === reason && styles.quickReasonTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label="Rejection Reason / Note"
              placeholder="e.g. Checked bank statement, payment not received."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              mode="outlined"
              outlineColor={M3Colors.outlineVariant}
              activeOutlineColor={M3Colors.error}
              style={{ backgroundColor: M3Colors.surfaceContainerLowest, marginBottom: 16 }}
            />

            <View style={styles.modalActionsRow}>
              <Button
                mode="text"
                onPress={() => setRejectModalVisible(false)}
                textColor={M3Colors.onSurfaceVariant}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirmReject}
                loading={rejecting}
                disabled={rejecting}
                buttonColor={M3Colors.error}
                textColor="#FFFFFF"
              >
                Confirm Reject
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'center',
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
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabBadge: {
    backgroundColor: '#E65100',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  allSettledCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
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
  approvalsContainer: {
    gap: 12,
  },
  adminRoleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerHigh,
    padding: 12,
    borderRadius: M3Shapes.cardMedium,
    gap: 10,
  },
  adminRoleText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  approvalCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardMedium,
    padding: M3Shapes.spacing.md,
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: M3Shapes.pill,
    gap: 4,
  },
  pendingPillText: {
    ...M3Typography.labelSm,
    color: '#E65100',
    fontWeight: '700',
    fontSize: 11,
  },
  approvalDate: {
    ...M3Typography.labelSm,
    color: M3Colors.outline,
    fontSize: 11,
  },
  approvalFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: M3Shapes.card,
  },
  flowParty: {
    flex: 1,
  },
  flowRole: {
    fontSize: 9,
    fontWeight: '800',
    color: M3Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  flowName: {
    ...M3Typography.labelLarge,
    fontWeight: '700',
    color: M3Colors.onSurface,
  },
  flowCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  flowAmount: {
    ...M3Typography.titleMedium,
    fontWeight: '900',
    color: M3Colors.primary,
  },
  approvalMetaBox: {
    backgroundColor: M3Colors.surfaceContainerLow,
    padding: 8,
    borderRadius: 8,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  metaValue: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  selfPayNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  selfPayNoticeText: {
    ...M3Typography.bodySm,
    color: '#E65100',
    fontSize: 11,
    flex: 1,
  },
  approvalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rejectBtn: {
    flex: 1,
    height: 40,
    borderRadius: M3Shapes.pill,
    borderWidth: 1.5,
    borderColor: M3Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: {
    ...M3Typography.labelMedium,
    color: M3Colors.error,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 2,
    height: 40,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 2,
  },
  approveBtnText: {
    ...M3Typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  nonAdminFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  nonAdminFooterText: {
    ...M3Typography.labelSm,
    color: M3Colors.outline,
    fontStyle: 'italic',
  },
  historyContainer: {
    gap: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  filterPillActive: {
    backgroundColor: M3Colors.primaryContainer,
  },
  filterPillText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
  },
  historyCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardMedium,
    padding: M3Shapes.spacing.md,
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: '800',
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  badgeApproved: {
    backgroundColor: M3Colors.primaryContainer,
  },
  badgeApprovedText: {
    color: M3Colors.onPrimaryContainer,
  },
  badgeRejected: {
    backgroundColor: '#FFEBEE',
  },
  badgeRejectedText: {
    color: M3Colors.error,
  },
  badgeCancelled: {
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  badgeCancelledText: {
    color: M3Colors.outline,
  },
  statusBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyAuditBox: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: M3Colors.surfaceContainerHigh,
    gap: 2,
  },
  auditText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  rejectModalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 8,
  },
  rejectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  rejectModalTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.error,
    fontWeight: '800',
  },
  rejectModalSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 18,
  },
  quickReasonsRow: {
    gap: 6,
    marginBottom: 12,
  },
  quickReasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: M3Shapes.card,
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  quickReasonChipActive: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: M3Colors.error,
  },
  quickReasonText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurface,
  },
  quickReasonTextActive: {
    color: M3Colors.error,
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
