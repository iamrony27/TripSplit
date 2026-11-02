import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
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
  currentUserId?: string;
  isCurrentUserDebtor: boolean;
  onConfirmPaid?: (suggestion: SettlementSuggestion) => void;
  onOpenQrModal?: (suggestion: SettlementSuggestion) => void;
}

export const SettlementCard: React.FC<SettlementCardProps> = ({
  suggestion,
  isCurrentUserDebtor,
  onConfirmPaid,
  onOpenQrModal,
}) => {
  const [isPaidLocally, setIsPaidLocally] = useState(false);

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

  return (
    <View style={styles.card}>
      {/* Status Header */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusTag,
            {
              backgroundColor: isCurrentUserDebtor
                ? M3Colors.errorContainer
                : M3Colors.primaryFixed,
            },
          ]}
        >
          <View
            style={[
              styles.pulseDot,
              {
                backgroundColor: isCurrentUserDebtor
                  ? M3Colors.error
                  : M3Colors.primary,
              },
            ]}
          />
          <Text
            style={[
              styles.statusTagText,
              {
                color: isCurrentUserDebtor
                  ? M3Colors.onErrorContainer
                  : M3Colors.onPrimaryFixed,
              },
            ]}
          >
            {isCurrentUserDebtor ? 'You Owe Money' : 'Payment to Receive'}
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

      {/* Recipient Profile & Amount Row */}
      <View style={styles.recipientRow}>
        <View style={styles.recipientInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {suggestion.toName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check" size={10} color={M3Colors.primary} />
            </View>
          </View>

          <View style={styles.nameColumn}>
            <Text style={styles.recipientName} numberOfLines={1}>
              {suggestion.toName}
            </Text>
            <View style={styles.upiIdRow}>
              <Text style={styles.upiIdText} numberOfLines={1}>
                {upiId}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.amountColumn}>
          <Text style={styles.amountLabel}>AMOUNT</Text>
          <Text
            style={[
              styles.amountText,
              isCurrentUserDebtor ? styles.amountDebit : styles.amountCredit,
            ]}
          >
            {formatCurrency(suggestion.amount, suggestion.currency)}
          </Text>
        </View>
      </View>

      {/* Dynamic QR Code Drawer */}
      <TouchableOpacity
        style={styles.qrDrawer}
        onPress={() => onOpenQrModal && onOpenQrModal(suggestion)}
        activeOpacity={0.8}
      >
        <View style={styles.qrWrapper}>
          <QRCode
            value={upiUri}
            size={90}
            color={M3Colors.onSurface}
            backgroundColor={M3Colors.surfaceContainerLowest}
          />
        </View>
        <View style={styles.qrTextCol}>
          <View style={styles.qrTitleRow}>
            <MaterialCommunityIcons name="qrcode-scan" size={16} color={M3Colors.primary} />
            <Text style={styles.qrTitle}>Tap to Enlarge QR Code</Text>
          </View>
          <Text style={styles.qrSubtitle}>
            Scan with GPay, PhonePe, Paytm or BHIM
          </Text>
        </View>
      </TouchableOpacity>

      {/* Quick Launchers (For Debtor) */}
      {isCurrentUserDebtor && (
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

      {/* Manual Verification Action Checkbox */}
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
          {isCurrentUserDebtor ? 'Mark as Paid after bank transfer' : 'Mark as Received & Settle'}
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
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: M3Shapes.spacing.md,
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: M3Shapes.spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: M3Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...M3Typography.titleMd,
    color: M3Colors.onSecondaryContainer,
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: 8,
    padding: 2,
    elevation: 2,
  },
  nameColumn: {
    flex: 1,
  },
  recipientName: {
    ...M3Typography.titleMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  upiIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  upiIdText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
  },
  amountColumn: {
    alignItems: 'flex-end',
    marginLeft: M3Shapes.spacing.sm,
  },
  amountLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  amountText: {
    ...M3Typography.headlineSm,
    fontWeight: '800',
  },
  amountDebit: {
    color: M3Colors.error,
  },
  amountCredit: {
    color: M3Colors.primary,
  },
  qrDrawer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLowest,
    padding: M3Shapes.spacing.sm,
    borderRadius: M3Shapes.card,
    gap: M3Shapes.spacing.md,
    borderWidth: 1,
    borderColor: M3Colors.surfaceContainerHigh,
    marginBottom: M3Shapes.spacing.sm,
  },
  qrWrapper: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
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
  },
  qrSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  launchersRow: {
    flexDirection: 'row',
    gap: M3Shapes.spacing.sm,
    marginBottom: M3Shapes.spacing.sm,
  },
  gpayBtn: {
    flex: 1,
    height: 40,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  phonepeBtn: {
    flex: 1,
    height: 40,
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
    fontWeight: '500',
  },
});
