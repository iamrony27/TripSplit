import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Button, ActivityIndicator, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTrips } from '../../context/TripContext';
import { TripMember } from '../../types/trip';
import { MergePreviewResult } from '../../services/firebase/memberMergeService';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

interface MemberMergeModalProps {
  visible: boolean;
  onClose?: () => void;
  onDismiss?: () => void;
  tripMembers?: TripMember[];
  trip?: { members: TripMember[] };
  onMergeSuccess?: () => void;
}

export const MemberMergeModal: React.FC<MemberMergeModalProps> = ({
  visible,
  onClose,
  onDismiss,
  tripMembers,
  trip,
  onMergeSuccess,
}) => {
  const { mergeMembers, previewMerge } = useTrips();
  const effectiveMembers = tripMembers || trip?.members || [];
  const handleClose = onClose || onDismiss || (() => {});

  const [sourceMemberId, setSourceMemberId] = useState<string>('');
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [step, setStep] = useState<'SELECT' | 'PREVIEW'>('SELECT');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<MergePreviewResult | null>(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (visible) {
      setSourceMemberId('');
      setTargetMemberId('');
      setStep('SELECT');
      setPreviewData(null);
    }
  }, [visible]);

  const handleProceedToPreview = async () => {
    if (!sourceMemberId || !targetMemberId) {
      Alert.alert('Selection Required', 'Please select both an existing profile to merge and the surviving target profile.');
      return;
    }

    if (sourceMemberId === targetMemberId) {
      Alert.alert('Invalid Selection', 'Source and target members cannot be the same person.');
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await previewMerge(sourceMemberId, targetMemberId);
      setPreviewData(res);
      setStep('PREVIEW');
    } catch (err: any) {
      Alert.alert('Preview Error', err.message || 'Failed to analyze member records.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmMerge = async () => {
    if (!sourceMemberId || !targetMemberId) return;

    setMerging(true);
    try {
      await mergeMembers(
        sourceMemberId,
        targetMemberId,
        `Consolidated profile by Admin`
      );
      Alert.alert(
        'Profiles Merged Successfully',
        'All historical expenses, shares, and settlements have been reassigned to the surviving member. Balances have been recalculated.'
      );
      if (onMergeSuccess) onMergeSuccess();
      handleClose();
    } catch (err: any) {
      Alert.alert('Merge Failed', err.message || 'Failed to complete member consolidation.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerIconCircle}>
              <MaterialCommunityIcons name="account-multiple-check" size={24} color={M3Colors.primary} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.modalTitle}>Consolidate Member Profiles</Text>
              <Text style={styles.modalSubtitle}>Admin Profile Merge Tool</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color={M3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* ================= STEP 1: SELECT PROFILES ================= */}
          {step === 'SELECT' && (
            <ScrollView style={styles.scrollArea}>
              <View style={styles.instructionBanner}>
                <MaterialCommunityIcons name="information-outline" size={18} color={M3Colors.primary} />
                <Text style={styles.instructionText}>
                  Use this tool when a member joined with an app account, but was previously added as an offline placeholder name.
                </Text>
              </View>

              {/* Source Selection (The duplicate / offline member) */}
              <Text style={styles.sectionHeader}>
                1. Select Profile to Consolidate (Source)
              </Text>
              <Text style={styles.sectionSub}>
                This duplicate or unlinked name will be merged into the target.
              </Text>

              <View style={styles.membersBox}>
                {effectiveMembers.map((m) => (
                  <TouchableOpacity
                    key={`source_${m.id}`}
                    style={[
                      styles.memberOptionRow,
                      sourceMemberId === m.id && styles.memberOptionActive,
                    ]}
                    onPress={() => setSourceMemberId(m.id)}
                  >
                    <RadioButton
                      value={m.id}
                      status={sourceMemberId === m.id ? 'checked' : 'unchecked'}
                      onPress={() => setSourceMemberId(m.id)}
                      color={M3Colors.primary}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberMeta}>
                        {m.userId ? 'App User' : 'Offline / Placeholder'} • Paid: ₹{m.totalPaid}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target Selection (The surviving real member) */}
              <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
                2. Select Surviving Member Profile (Target)
              </Text>
              <Text style={styles.sectionSub}>
                All transactions and settlements will be re-assigned to this identity.
              </Text>

              <View style={styles.membersBox}>
                {effectiveMembers.map((m) => {
                  const isDisabled = m.id === sourceMemberId;
                  return (
                    <TouchableOpacity
                      key={`target_${m.id}`}
                      disabled={isDisabled}
                      style={[
                        styles.memberOptionRow,
                        targetMemberId === m.id && styles.memberOptionActive,
                        isDisabled && { opacity: 0.4 },
                      ]}
                      onPress={() => setTargetMemberId(m.id)}
                    >
                      <RadioButton
                        value={m.id}
                        disabled={isDisabled}
                        status={targetMemberId === m.id ? 'checked' : 'unchecked'}
                        onPress={() => setTargetMemberId(m.id)}
                        color={M3Colors.primary}
                      />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <Text style={styles.memberMeta}>
                          {m.userId ? `Linked User ID: ${m.userId.substring(0, 8)}...` : 'Offline Profile'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                mode="contained"
                onPress={handleProceedToPreview}
                loading={loadingPreview}
                disabled={!sourceMemberId || !targetMemberId || sourceMemberId === targetMemberId || loadingPreview}
                buttonColor={M3Colors.primary}
                textColor={M3Colors.onPrimary}
                style={styles.actionBtn}
              >
                Review Merge Impact
              </Button>
            </ScrollView>
          )}

          {/* ================= STEP 2: PREVIEW MERGE IMPACT ================= */}
          {step === 'PREVIEW' && previewData && (
            <ScrollView style={styles.scrollArea}>
              <View style={styles.previewFlowBox}>
                <View style={styles.previewParty}>
                  <Text style={styles.partyRole}>CONSOLIDATING</Text>
                  <Text style={styles.partyName}>{previewData.sourceMember.name}</Text>
                  <Text style={styles.partyStatus}>
                    {previewData.sourceMember.userId ? 'App User' : 'Offline Profile'}
                  </Text>
                </View>

                <MaterialCommunityIcons name="arrow-right-bold" size={26} color={M3Colors.primary} />

                <View style={[styles.previewParty, { alignItems: 'flex-end' }]}>
                  <Text style={styles.partyRole}>SURVIVING TARGET</Text>
                  <Text style={styles.partyName}>{previewData.targetMember.name}</Text>
                  <Text style={[styles.partyStatus, { color: M3Colors.primary }]}>
                    {previewData.targetMember.userId ? 'Authenticated Member' : 'Primary Member'}
                  </Text>
                </View>
              </View>

              <Text style={styles.impactTitle}>Transactions to be Re-assigned:</Text>

              <View style={styles.impactCard}>
                <View style={styles.impactRow}>
                  <MaterialCommunityIcons name="cash-multiple" size={18} color={M3Colors.primary} />
                  <Text style={styles.impactLabel}>Expenses Paid by Source:</Text>
                  <Text style={styles.impactValue}>{previewData.expensesPaidCount}</Text>
                </View>
                <View style={styles.impactDivider} />

                <View style={styles.impactRow}>
                  <MaterialCommunityIcons name="account-group" size={18} color={M3Colors.secondary} />
                  <Text style={styles.impactLabel}>Expense Splits & Shares:</Text>
                  <Text style={styles.impactValue}>{previewData.expensesParticipatedCount}</Text>
                </View>
                <View style={styles.impactDivider} />

                <View style={styles.impactRow}>
                  <MaterialCommunityIcons name="hand-coin" size={18} color={M3Colors.tertiary} />
                  <Text style={styles.impactLabel}>Settlements / Payments:</Text>
                  <Text style={styles.impactValue}>
                    {previewData.paymentsMadeCount + previewData.paymentsReceivedCount}
                  </Text>
                </View>
              </View>

              <View style={styles.safeNotice}>
                <MaterialCommunityIcons name="shield-check" size={18} color={M3Colors.primary} />
                <Text style={styles.safeNoticeText}>
                  Audit Integrity Guarantee: Original expense records, notes, categories, and references are permanently preserved. Net balances will be dynamically recalculated for the group.
                </Text>
              </View>

              <View style={styles.previewActionsRow}>
                <Button
                  mode="text"
                  onPress={() => setStep('SELECT')}
                  textColor={M3Colors.onSurfaceVariant}
                  style={{ flex: 1 }}
                >
                  Back
                </Button>

                <Button
                  mode="contained"
                  onPress={handleConfirmMerge}
                  loading={merging}
                  disabled={merging}
                  buttonColor={M3Colors.primary}
                  textColor={M3Colors.onPrimary}
                  style={{ flex: 2 }}
                >
                  Confirm & Merge
                </Button>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderTopLeftRadius: M3Shapes.cardLarge,
    borderTopRightRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    maxHeight: '90%',
    elevation: 8,
  },
  headerRow: {
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
    padding: 4,
  },
  scrollArea: {
    maxHeight: 520,
  },
  instructionBanner: {
    flexDirection: 'row',
    backgroundColor: M3Colors.surfaceContainerHigh,
    padding: 10,
    borderRadius: M3Shapes.cardMedium,
    gap: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  instructionText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  sectionHeader: {
    ...M3Typography.labelLarge,
    color: M3Colors.onSurface,
    fontWeight: '800',
  },
  sectionSub: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    marginBottom: 8,
  },
  membersBox: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardMedium,
    padding: 6,
    gap: 4,
  },
  memberOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: M3Shapes.cardSmall,
  },
  memberOptionActive: {
    backgroundColor: M3Colors.primaryContainer,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 6,
  },
  memberName: {
    ...M3Typography.labelLarge,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  memberMeta: {
    fontSize: 11,
    color: M3Colors.onSurfaceVariant,
    marginTop: 1,
  },
  actionBtn: {
    marginTop: 16,
    borderRadius: M3Shapes.pill,
    marginBottom: 10,
  },
  previewFlowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardMedium,
    padding: 14,
    marginBottom: 16,
  },
  previewParty: {
    flex: 1,
  },
  partyRole: {
    fontSize: 9,
    fontWeight: '800',
    color: M3Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  partyName: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '800',
  },
  partyStatus: {
    fontSize: 11,
    color: M3Colors.onSurfaceVariant,
    marginTop: 1,
  },
  impactTitle: {
    ...M3Typography.labelLarge,
    color: M3Colors.onSurface,
    fontWeight: '800',
    marginBottom: 8,
  },
  impactCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardMedium,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactLabel: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    flex: 1,
  },
  impactValue: {
    ...M3Typography.labelLarge,
    color: M3Colors.onSurface,
    fontWeight: '800',
  },
  impactDivider: {
    height: 1,
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  safeNotice: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: M3Shapes.cardMedium,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  safeNoticeText: {
    ...M3Typography.bodySm,
    color: '#1B5E20',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  previewActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
});
