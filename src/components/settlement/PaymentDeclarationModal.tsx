import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettlementSuggestion } from '../../types/settlement';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';
import { formatCurrency } from '../../services/currency/exchangeRateService';

interface PaymentDeclarationModalProps {
  visible: boolean;
  onClose: () => void;
  suggestion: SettlementSuggestion;
  tripTitle?: string;
  onSubmit: (params: {
    upiTxnId?: string;
    note?: string;
  }) => Promise<void>;
}

export const PaymentDeclarationModal: React.FC<PaymentDeclarationModalProps> = ({
  visible,
  onClose,
  suggestion,
  tripTitle,
  onSubmit,
}) => {
  const [upiTxnId, setUpiTxnId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        upiTxnId: upiTxnId.trim() || undefined,
        note: note.trim() || undefined,
      });
      setUpiTxnId('');
      setNote('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment declaration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconCircle}>
              <MaterialCommunityIcons name="shield-check" size={24} color={M3Colors.primary} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.modalTitle}>Declare UPI Payment</Text>
              <Text style={styles.modalSubtitle}>Requires Group Admin Approval</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color={M3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
            {/* Warning Banner: Declaration ≠ Verified */}
            <View style={styles.noticeBanner}>
              <MaterialCommunityIcons name="information" size={18} color="#E65100" />
              <Text style={styles.noticeText}>
                Declaring payment alerts the Group Admin to verify receipt in their bank app. Your balance will update only after Admin approval.
              </Text>
            </View>

            {/* Transfer Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payer (You)</Text>
                <Text style={styles.summaryValue}>{suggestion.fromName}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Receiver (Payee)</Text>
                <Text style={styles.summaryValue}>{suggestion.toName}</Text>
              </View>
              {suggestion.toUpiId && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Payee UPI ID</Text>
                    <Text style={[styles.summaryValue, { color: M3Colors.primary }]}>
                      {suggestion.toUpiId}
                    </Text>
                  </View>
                </>
              )}
              {tripTitle && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Group</Text>
                    <Text style={styles.summaryValue}>{tripTitle}</Text>
                  </View>
                </>
              )}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount Declared</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(suggestion.amount, suggestion.currency)}
                </Text>
              </View>
            </View>

            {/* Inputs */}
            <View style={styles.formSection}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TextInput
                label="UPI Reference / UTR Number (Optional)"
                placeholder="e.g. 428901234567 (12 digits)"
                value={upiTxnId}
                onChangeText={(t) => {
                  setUpiTxnId(t);
                  if (error) setError('');
                }}
                mode="outlined"
                keyboardType="numeric"
                outlineColor={M3Colors.outlineVariant}
                activeOutlineColor={M3Colors.primary}
                left={<TextInput.Icon icon="receipt" />}
                style={styles.input}
              />
              <Text style={styles.inputHelper}>
                Found in your Google Pay, PhonePe, or Paytm payment receipt.
              </Text>

              <TextInput
                label="Payment Note / Description (Optional)"
                placeholder="e.g. Paid via PhonePe at 6:45 PM"
                value={note}
                onChangeText={setNote}
                mode="outlined"
                outlineColor={M3Colors.outlineVariant}
                activeOutlineColor={M3Colors.primary}
                left={<TextInput.Icon icon="note-text-outline" />}
                style={styles.input}
              />
            </View>

            {/* Status indicator preview */}
            <View style={styles.statusPreviewRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPreviewText}>
                Initial Status: <Text style={styles.statusBold}>PENDING ADMIN APPROVAL</Text>
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <Button
              mode="text"
              onPress={onClose}
              textColor={M3Colors.onSurfaceVariant}
              style={styles.cancelBtn}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              buttonColor={M3Colors.primary}
              textColor={M3Colors.onPrimary}
              icon="check-circle"
              style={styles.submitBtn}
            >
              I Have Paid
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContainer: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderTopLeftRadius: M3Shapes.cardLarge,
    borderTopRightRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    maxHeight: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  modalTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '800',
  },
  modalSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    maxHeight: 460,
  },
  noticeBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: M3Shapes.cardMedium,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  noticeText: {
    ...M3Typography.bodySm,
    color: '#E65100',
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardMedium,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  summaryValue: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: M3Colors.outlineVariant,
    opacity: 0.4,
  },
  amountValue: {
    ...M3Typography.titleMedium,
    color: M3Colors.primary,
    fontWeight: '800',
  },
  formSection: {
    gap: 8,
    marginBottom: 16,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  inputHelper: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  errorText: {
    ...M3Typography.bodySm,
    color: M3Colors.error,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: M3Shapes.pill,
    marginBottom: 16,
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F57C00',
  },
  statusPreviewText: {
    ...M3Typography.labelSm,
    color: '#E65100',
    fontSize: 11,
  },
  statusBold: {
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    borderRadius: M3Shapes.pill,
  },
  submitBtn: {
    borderRadius: M3Shapes.pill,
    paddingHorizontal: 16,
  },
});
