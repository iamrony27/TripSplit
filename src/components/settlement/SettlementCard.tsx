import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettlementSuggestion } from '../../types/settlement';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';
import { formatCurrency } from '../../services/currency/exchangeRateService';
import { generateUpiPaymentUri, launchUpiPayment } from '../../services/upi/upiLauncher';

interface SettlementCardProps {
  suggestion: SettlementSuggestion;
  currentMemberId?: string;
  currentUserId?: string;
  onConfirmPaid?: (suggestion: SettlementSuggestion) => void;
  onOpenQrModal?: (suggestion: SettlementSuggestion) => void;
}

export const SettlementCard: React.FC<SettlementCardProps> = ({
  suggestion,
  currentMemberId,
  currentUserId,
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

  const upiId = suggestion.toUpiId || `${suggestion.toName.toLowerCase().replace(/\s+/g, '')}@okaxis`;
  const upiUri = generateUpiPaymentUri({
    upiId,
    payeeName: suggestion.toName,
    amount: suggestion.amount,
    currency: suggestion.currency || 'INR',
    note: `TripSplit to ${suggestion.toName}`,
  });

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
            name={isPaidLocally ? 'check-circle' : 'clock-outline'}
            size={14}
            color={isPaidLocally ? M3Colors.primary : M3Colors.outline}
          />
          <Text
            style={[
              styles.pendingText,
              isPaidLocally ? { color: M3Colors.primary, fontWeight: '700' } : null,
            ]}
          >
            {isPaidLocally ? 'Paid & Verified' : 'Pending Transfer'}
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

      {/* 4. Payee UPI Info & QR Code Drawer */}
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

      {/* 5. 1-Tap UPI Launchers (for Payer) */}
      {isPayer && (
        <View style={styles.launchersRow}>
          <TouchableOpacity
            style={styles.gpayBtn}
            onPress={() =>
              launchUpiPayment({
                upiId,
                payeeName: suggestion.toName,
                amount: suggestion.amount,
              }, 'GPAY')
            }
          >
            <MaterialCommunityIcons name="google" size={16} color="#4285F4" />
            <Text style={styles.launcherBtnText}>Google Pay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.phonepeBtn}
            onPress={() =>
              launchUpiPayment({
                upiId,
                payeeName: suggestion.toName,
                amount: suggestion.amount,
              }, 'PHONEPE')
            }
          >
            <MaterialCommunityIcons name="cellphone" size={16} color={M3Colors.onSecondaryFixed} />
            <Text style={[styles.launcherBtnText, { color: M3Colors.onSecondaryFixed }]}>
              PhonePe
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. Mark as Paid / Settled Confirmation Checkbox */}
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
          {isPayer
            ? `Mark as Paid to ${suggestion.toName}`
            : isReceiver
            ? `Mark as Received from ${suggestion.fromName}`
            : 'Mark as Settled'}
        </Text>
      </TouchableOpacity>
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
});
