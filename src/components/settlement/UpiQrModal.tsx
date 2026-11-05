import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';
import { formatCurrency } from '../../services/currency/exchangeRateService';
import { generateUpiPaymentUri, launchUpiPayment } from '../../services/upi/upiLauncher';

interface UpiQrModalProps {
  visible: boolean;
  onClose: () => void;
  payeeName: string;
  upiId: string;
  amount: number;
  note?: string;
  onMarkAsPaid?: () => void;
}

export const UpiQrModal: React.FC<UpiQrModalProps> = ({
  visible,
  onClose,
  payeeName,
  upiId,
  amount,
  note = 'TripSplit Settlement',
  onMarkAsPaid,
}) => {
  const upiUri = generateUpiPaymentUri({
    upiId,
    payeeName,
    amount,
    currency: 'INR',
    note,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Scan to Pay</Text>
              <Text style={styles.subtitle}>{payeeName} via UPI</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={M3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Amount Display */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>AMOUNT TO TRANSFER</Text>
            <Text style={styles.amountValue}>{formatCurrency(amount, 'INR')}</Text>
            <Text style={styles.upiIdText}>{upiId}</Text>
          </View>

          {/* Dynamic Vector QR Matrix */}
          <View style={styles.qrContainer}>
            {upiUri ? (
              <>
                <QRCode
                  value={upiUri}
                  size={180}
                  color={M3Colors.onSurface}
                  backgroundColor={M3Colors.surfaceContainerLowest}
                />
                <Text style={styles.qrHint}>
                  Scan using any UPI app (Google Pay, PhonePe, Paytm, BHIM)
                </Text>
              </>
            ) : (
              <Text style={styles.qrHint}>
                No valid UPI ID provided for this member.
              </Text>
            )}
          </View>

          {/* Quick UPI Intent Launchers */}
          <View style={styles.launcherRow}>
            <TouchableOpacity
              style={styles.gpayButton}
              onPress={() => launchUpiPayment({ upiId, payeeName, amount, note }, 'GPAY')}
            >
              <MaterialCommunityIcons name="google" size={18} color="#4285F4" />
              <Text style={styles.launcherText}>Google Pay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.phonepeButton}
              onPress={() => launchUpiPayment({ upiId, payeeName, amount, note }, 'PHONEPE')}
            >
              <MaterialCommunityIcons name="cellphone" size={18} color={M3Colors.onSecondaryFixed} />
              <Text style={[styles.launcherText, { color: M3Colors.onSecondaryFixed }]}>
                PhonePe
              </Text>
            </TouchableOpacity>
          </View>

          {/* Manual Mark as Paid Action */}
          {onMarkAsPaid && (
            <TouchableOpacity
              style={styles.markPaidBtn}
              onPress={() => {
                onClose();
                onMarkAsPaid();
              }}
            >
              <MaterialCommunityIcons name="check-circle" size={20} color={M3Colors.onPrimary} />
              <Text style={styles.markPaidText}>I Have Completed This Payment</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderTopLeftRadius: M3Shapes.bottomSheet,
    borderTopRightRadius: M3Shapes.bottomSheet,
    padding: M3Shapes.spacing.lg,
    alignItems: 'center',
    elevation: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: M3Colors.outlineVariant,
    marginBottom: M3Shapes.spacing.md,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: M3Shapes.spacing.md,
  },
  title: {
    ...M3Typography.titleLg,
    color: M3Colors.onSurface,
  },
  subtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
  },
  closeBtn: {
    padding: 4,
  },
  amountBox: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    padding: M3Shapes.spacing.md,
    borderRadius: M3Shapes.card,
    marginBottom: M3Shapes.spacing.md,
  },
  amountLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  amountValue: {
    ...M3Typography.headlineLg,
    color: M3Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  upiIdText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurface,
    fontWeight: '600',
    marginTop: 4,
  },
  qrContainer: {
    padding: M3Shapes.spacing.md,
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: M3Colors.surfaceContainerHigh,
    marginBottom: M3Shapes.spacing.md,
  },
  qrHint: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 10,
    textAlign: 'center',
  },
  launcherRow: {
    flexDirection: 'row',
    gap: M3Shapes.spacing.sm,
    width: '100%',
    marginBottom: M3Shapes.spacing.md,
  },
  gpayButton: {
    flex: 1,
    height: 44,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  phonepeButton: {
    flex: 1,
    height: 44,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.secondaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  launcherText: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  markPaidBtn: {
    width: '100%',
    height: 48,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  markPaidText: {
    ...M3Typography.labelLg,
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
});
