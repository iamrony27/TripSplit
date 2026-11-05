import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PaymentRecord, SettlementSuggestion } from '../../types/settlement';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';
import { formatCurrency } from '../../services/currency/exchangeRateService';
import { generateUpiPaymentUri, launchUpiPayment } from '../../services/upi/upiLauncher';
import { isValidUpiId } from '../../services/upi/upiParser';

interface SettlementCardProps {
  suggestion: SettlementSuggestion;
  currentMemberId?: string;
  currentUserId?: string;
  pendingDeclaration?: PaymentRecord | null;
  onPayViaUpi?: (suggestion: SettlementSuggestion) => void;
  onDeclarePaid?: (suggestion: SettlementSuggestion) => void;
  onCancelDeclaration?: (paymentId: string) => void;
  onConfirmPaid?: (suggestion: SettlementSuggestion) => void;
  onOpenQrModal?: (suggestion: SettlementSuggestion) => void;
}

export const SettlementCard: React.FC<SettlementCardProps> = ({
  suggestion,
  currentMemberId,
  currentUserId,
  pendingDeclaration,
  onPayViaUpi,
  onDeclarePaid,
  onCancelDeclaration,
  onConfirmPaid,
  onOpenQrModal,
}) => {
  const [isPaidLocally, setIsPaidLocally] = useState(false);

  // Determine user relationship to this settlement
  const isPayer = Boolean(
    (currentMemberId && suggestion.fromMemberId === currentMemberId) ||
    (currentUserId && suggestion.fromMemberId === currentUserId) ||
    (currentUserId && suggestion.fromMemberId.includes(currentUserId))
  );

  const isReceiver = Boolean(
    (currentMemberId && suggestion.toMemberId === currentMemberId) ||
    (currentUserId && suggestion.toMemberId === currentUserId) ||
    (currentUserId && suggestion.toMemberId.includes(currentUserId))
  );

  const rawUpi = suggestion.toUpiId?.trim() || '';
  const hasUpiId = Boolean(rawUpi && isValidUpiId(rawUpi));
  const upiId = hasUpiId ? rawUpi : '';
  const upiUri = hasUpiId
    ? generateUpiPaymentUri({
        upiId,
        payeeName: suggestion.toName,
        amount: suggestion.amount,
        currency: suggestion.currency || 'INR',
        note: `TripSplit to ${suggestion.toName}`,
      })
    : '';

  const handleLaunchUpi = () => {
    if (!hasUpiId) {
      Alert.alert(
        'No UPI ID',
        `${suggestion.toName} has not added a UPI ID yet. Ask them to add their UPI ID in group members to enable direct UPI payments.`
      );
      return;
    }
    if (onPayViaUpi) {
      onPayViaUpi(suggestion);
    } else {
      launchUpiPayment({
        upiId,
        payeeName: suggestion.toName,
        amount: suggestion.amount,
        currency: suggestion.currency || 'INR',
        note: `TripSplit to ${suggestion.toName}`,
      });
    }
  };

  const handleTogglePaid = () => {
    if (onConfirmPaid) {
      onConfirmPaid(suggestion);
    } else {
      setIsPaidLocally(!isPaidLocally);
    }
  };

  // Human-readable summary
  let relationshipSummary = `${suggestion.fromName} will pay ${formatCurrency(suggestion.amount, suggestion.currency)} to ${suggestion.toName}`;
  let badgeText = 'Group Transfer';
  let badgeBg: string = M3Colors.surfaceContainerHigh;
  let badgeColor: string = M3Colors.onSurfaceVariant;

  if (isPayer) {
    badgeText = 'You Owe Money';
    badgeBg = M3Colors.errorContainer;
    badgeColor = M3Colors.onErrorContainer;
    relationshipSummary = `You need to pay ${formatCurrency(suggestion.amount, suggestion.currency)} to ${suggestion.toName}`;
  } else if (isReceiver) {
    badgeText = 'Payment to Receive';
    badgeBg = M3Colors.primaryFixed;
    badgeColor = M3Colors.onPrimaryFixed;
    relationshipSummary = `${suggestion.fromName} owes you ${formatCurrency(suggestion.amount, suggestion.currency)}`;
  }

  return (
    <View style={styles.card}>
      {/* 1. Header with Status & Pending state */}
      <View style={styles.statusRow}>
        <View style={[styles.statusTag, { backgroundColor: badgeBg }]}>
          <View
            style={[
              styles.pulseDot,
              {
                backgroundColor: isPayer
                  ? M3Colors.error
                  : isReceiver
                  ? M3Colors.primary
                  : M3Colors.onSurfaceVariant,
              },
            ]}
          />
          <Text style={[styles.statusTagText, { color: badgeColor }]}>
            {badgeText}
          </Text>
        </View>

        <View style={styles.pendingBadge}>
          <MaterialCommunityIcons
            name={
              pendingDeclaration
                ? 'clock-alert-outline'
                : isPaidLocally
                ? 'check-circle'
                : 'clock-outline'
            }
            size={14}
            color={
              pendingDeclaration
                ? '#E65100'
                : isPaidLocally
                ? M3Colors.primary
                : M3Colors.outline
            }
          />
          <Text
            style={[
              styles.pendingText,
              pendingDeclaration
                ? { color: '#E65100', fontWeight: '700' }
                : isPaidLocally
                ? { color: M3Colors.primary, fontWeight: '700' }
                : null,
            ]}
          >
            {pendingDeclaration
              ? 'Pending Approval'
              : isPaidLocally
              ? 'Paid & Verified'
              : 'Pending Transfer'}
          </Text>
        </View>
      </View>

      {/* 2. Visual Transfer Flow Box (From Payer ➔ To Receiver) */}
      <View style={styles.flowContainer}>
        {/* Payer (Left) */}
        <View style={styles.memberBlock}>
          <Text style={styles.roleLabel}>PAYER (দেবে)</Text>
          <View style={styles.payerAvatar}>
            <Text style={styles.payerAvatarText}>
              {suggestion.fromName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.memberName} numberOfLines={1}>
            {isPayer ? `${suggestion.fromName} (You)` : suggestion.fromName}
          </Text>
          <Text style={styles.memberSubtext}>Debtor</Text>
        </View>

        {/* Central Arrow & Amount */}
        <View style={styles.arrowBlock}>
          <Text
            style={[
              styles.amountText,
              isPayer ? styles.amountDebit : styles.amountCredit,
            ]}
          >
            {formatCurrency(suggestion.amount, suggestion.currency)}
          </Text>
          <View style={styles.arrowPill}>
            <MaterialCommunityIcons name="arrow-right-bold" size={20} color={M3Colors.primary} />
          </View>
        </View>

        {/* Receiver (Right) */}
        <View style={styles.memberBlock}>
          <Text style={styles.roleLabel}>RECEIVER (পাবে)</Text>
          <View style={styles.receiverAvatar}>
            <Text style={styles.receiverAvatarText}>
              {suggestion.toName.charAt(0).toUpperCase()}
            </Text>
            <View style={styles.verifiedCheck}>
              <MaterialCommunityIcons name="check" size={9} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.memberName} numberOfLines={1}>
            {isReceiver ? `${suggestion.toName} (You)` : suggestion.toName}
          </Text>
          <Text style={styles.memberSubtext}>Creditor</Text>
        </View>
      </View>

      {/* 3. Explicit Plain-Language Sentence */}
      <View style={styles.explanationBanner}>
        <MaterialCommunityIcons name="information-outline" size={16} color={M3Colors.primary} />
        <Text style={styles.explanationText}>
          {relationshipSummary}
        </Text>
      </View>

      {/* Pending Declaration Banner if already declared */}
      {pendingDeclaration && (
        <View style={styles.pendingDeclarationBox}>
          <View style={styles.pendingDeclarationHeader}>
            <MaterialCommunityIcons name="clock-time-four-outline" size={18} color="#E65100" />
            <Text style={styles.pendingDeclarationTitle}>Payment Declared - Waiting for Admin</Text>
          </View>
          <Text style={styles.pendingDeclarationSubtext}>
            Declared {formatCurrency(pendingDeclaration.amount, pendingDeclaration.currency)} on{' '}
            {new Date(pendingDeclaration.createdAt).toLocaleDateString()}
            {pendingDeclaration.upiTransactionReference ? ` • UTR: ${pendingDeclaration.upiTransactionReference}` : ''}
          </Text>
          {isPayer && onCancelDeclaration && (
            <TouchableOpacity
              style={styles.cancelDeclarationBtn}
              onPress={() => onCancelDeclaration(pendingDeclaration.id)}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={14} color={M3Colors.error} />
              <Text style={styles.cancelDeclarationText}>Cancel Declaration</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 4. Payee UPI Info & QR Code Drawer (ONLY when UPI ID is valid) */}
      {hasUpiId ? (
        <TouchableOpacity
          style={styles.qrDrawer}
          onPress={() => onOpenQrModal && onOpenQrModal(suggestion)}
          activeOpacity={0.8}
        >
          <View style={styles.qrWrapper}>
            <QRCode
              value={upiUri}
              size={74}
              color={M3Colors.onSurface}
              backgroundColor={M3Colors.surfaceContainerLowest}
            />
          </View>
          <View style={styles.qrTextCol}>
            <View style={styles.qrTitleRow}>
              <MaterialCommunityIcons name="qrcode-scan" size={15} color={M3Colors.primary} />
              <Text style={styles.qrTitle}>
                {isReceiver ? 'Your UPI QR Code' : `Pay ${suggestion.toName} via UPI`}
              </Text>
            </View>
            <Text style={styles.upiIdDisplay} numberOfLines={1}>
              UPI ID: {upiId}
            </Text>
            <Text style={styles.qrSubtitle}>
              {isReceiver
                ? `Show to ${suggestion.fromName} to collect money`
                : 'Scan with GPay, PhonePe, Paytm or BHIM'}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.noUpiBanner}>
          <MaterialCommunityIcons name="shield-alert-outline" size={20} color={M3Colors.outline} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noUpiTitle}>
              {isReceiver ? 'No UPI ID Added' : `${suggestion.toName} has no UPI ID`}
            </Text>
            <Text style={styles.noUpiText}>
              {isReceiver
                ? 'Link your UPI ID in Group Members to enable QR code and receive instant payments.'
                : 'QR code and UPI quick-pay are disabled until this member adds their UPI ID.'}
            </Text>
          </View>
        </View>
      )}

      {/* 5. UPI Actions & I HAVE PAID Declaration (for Payer) */}
      {isPayer && (
        <View style={styles.actionsContainer}>
          {/* Main PAY VIA UPI Button (only if UPI ID is configured) */}
          {hasUpiId && (
            <TouchableOpacity
              style={styles.payViaUpiBtn}
              onPress={handleLaunchUpi}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFFFFF" />
              <Text style={styles.payViaUpiText}>PAY VIA UPI</Text>
            </TouchableOpacity>
          )}

          {/* I HAVE PAID / Pending state button */}
          {!pendingDeclaration ? (
            <TouchableOpacity
              style={styles.havePaidBtn}
              onPress={() => onDeclarePaid && onDeclarePaid(suggestion)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={M3Colors.primary} />
              <Text style={styles.havePaidText}>I HAVE PAID</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.awaitingApprovalBadge}>
              <MaterialCommunityIcons name="timer-sand" size={16} color="#E65100" />
              <Text style={styles.awaitingApprovalText}>Awaiting Admin Approval</Text>
            </View>
          )}

          {/* Quick Launchers (only if UPI ID is configured) */}
          {hasUpiId && (
            <View style={styles.launchersRow}>
              <TouchableOpacity
                style={styles.gpayBtn}
                onPress={() =>
                  launchUpiPayment(
                    {
                      upiId,
                      payeeName: suggestion.toName,
                      amount: suggestion.amount,
                      currency: suggestion.currency || 'INR',
                      note: `TripSplit to ${suggestion.toName}`,
                    },
                    'GPAY'
                  )
                }
              >
                <MaterialCommunityIcons name="google" size={16} color="#4285F4" />
                <Text style={styles.launcherBtnText}>Google Pay</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.phonepeBtn}
                onPress={() =>
                  launchUpiPayment(
                    {
                      upiId,
                      payeeName: suggestion.toName,
                      amount: suggestion.amount,
                      currency: suggestion.currency || 'INR',
                      note: `TripSplit to ${suggestion.toName}`,
                    },
                    'PHONEPE'
                  )
                }
              >
                <MaterialCommunityIcons name="cellphone" size={16} color={M3Colors.onSecondaryFixed} />
                <Text style={[styles.launcherBtnText, { color: M3Colors.onSecondaryFixed }]}>
                  PhonePe
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* 6. Admin or direct confirmation fallback */}
      {!isPayer && (
        <TouchableOpacity
          style={styles.markPaidRow}
          onPress={handleTogglePaid}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={isPaidLocally ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
            size={20}
            color={isPaidLocally ? M3Colors.primary : M3Colors.outline}
          />
          <Text style={styles.markPaidLabel}>
            {isReceiver
              ? `Confirm Payment Received from ${suggestion.fromName}`
              : 'Direct Settle (Admin)'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.md,
    marginVertical: M3Shapes.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: M3Shapes.spacing.sm,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: M3Shapes.pill,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    ...M3Typography.labelMd,
    fontWeight: '700',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingText: {
    ...M3Typography.labelSm,
    color: M3Colors.outline,
  },
  flowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.sm,
    borderWidth: 1,
    borderColor: M3Colors.surfaceContainerHigh,
    marginBottom: 8,
  },
  memberBlock: {
    flex: 1,
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  payerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFEBEE',
    borderWidth: 1.5,
    borderColor: '#EF9A9A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  payerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: M3Colors.error,
  },
  receiverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  receiverAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: M3Colors.primary,
  },
  verifiedCheck: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    ...M3Typography.labelMd,
    fontWeight: '700',
    color: M3Colors.onSurface,
    textAlign: 'center',
    maxWidth: 95,
  },
  memberSubtext: {
    fontSize: 10,
    color: M3Colors.outline,
    marginTop: 1,
  },
  arrowBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  arrowPill: {
    width: 32,
    height: 24,
    borderRadius: 12,
    backgroundColor: M3Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  amountText: {
    ...M3Typography.titleMedium,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  amountDebit: {
    color: M3Colors.error,
  },
  amountCredit: {
    color: M3Colors.primary,
  },
  explanationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerHigh,
    paddingHorizontal: M3Shapes.spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  explanationText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  qrDrawer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLowest,
    padding: M3Shapes.spacing.sm,
    borderRadius: M3Shapes.card,
    gap: M3Shapes.spacing.sm,
    borderWidth: 1,
    borderColor: M3Colors.surfaceContainerHigh,
    marginBottom: M3Shapes.spacing.sm,
  },
  noUpiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: M3Shapes.spacing.md,
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.cardMedium,
    marginBottom: M3Shapes.spacing.sm,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  noUpiTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
    fontSize: 13,
  },
  noUpiText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  qrWrapper: {
    padding: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  qrTextCol: {
    flex: 1,
  },
  qrTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qrTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  upiIdDisplay: {
    ...M3Typography.labelSm,
    color: M3Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  qrSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  launchersRow: {
    flexDirection: 'row',
    gap: M3Shapes.spacing.sm,
    marginBottom: M3Shapes.spacing.sm,
  },
  gpayBtn: {
    flex: 1,
    height: 38,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  phonepeBtn: {
    flex: 1,
    height: 38,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.secondaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  launcherBtnText: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  markPaidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainer,
    padding: M3Shapes.spacing.sm,
    borderRadius: M3Shapes.pill,
    gap: 8,
    marginTop: 2,
  },
  markPaidLabel: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  pendingDeclarationBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: M3Shapes.cardMedium,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    padding: 10,
    marginBottom: 8,
    gap: 4,
  },
  pendingDeclarationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingDeclarationTitle: {
    ...M3Typography.labelMd,
    color: '#E65100',
    fontWeight: '800',
  },
  pendingDeclarationSubtext: {
    ...M3Typography.bodySm,
    color: '#BF360C',
    fontSize: 11,
    lineHeight: 16,
  },
  cancelDeclarationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#FFEBEE',
  },
  cancelDeclarationText: {
    fontSize: 11,
    fontWeight: '700',
    color: M3Colors.error,
  },
  actionsContainer: {
    gap: 8,
    marginBottom: 8,
  },
  payViaUpiBtn: {
    height: 44,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  payViaUpiText: {
    ...M3Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  havePaidBtn: {
    height: 42,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  havePaidText: {
    ...M3Typography.labelLarge,
    color: M3Colors.primary,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  awaitingApprovalBadge: {
    height: 38,
    borderRadius: M3Shapes.pill,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  awaitingApprovalText: {
    ...M3Typography.labelMd,
    color: '#E65100',
    fontWeight: '700',
  },
});
