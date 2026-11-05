import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTrips } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { MemberRole, TripMember } from '../../src/types/trip';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { formatCurrency } from '../../src/services/currency/exchangeRateService';
import { isValidUpiId } from '../../src/services/upi/upiParser';
import { safeGoBack } from '../../src/utils/navigation';
import { UpiScannerModal } from '../../src/components/common/UpiScannerModal';

export default function TripMembersScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const {
    trips,
    memberBalances,
    isTripAdmin,
    addMember,
    removeMember,
    updateTrip,
  } = useTrips();

  const trip = trips.find((t) => t.id === id) || trips[0];

  // Add Member State
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUpi, setNewMemberUpi] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit UPI State
  const [editUpiMember, setEditUpiMember] = useState<TripMember | null>(null);
  const [editUpiText, setEditUpiText] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiError, setUpiError] = useState('');

  // QR Scanner Modal State
  const [scannerMode, setScannerMode] = useState<'add' | 'edit' | null>(null);

  if (!trip) {
    return (
      <View style={styles.container}>
        <TopAppBar
          title="Members"
          showBack
          fallbackRoute="/(tabs)"
          onBackPress={() => safeGoBack(router, '/(tabs)')}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No trip found</Text>
        </View>
      </View>
    );
  }

  const baseCurrency = trip.baseCurrency || 'INR';

  const handleAddMember = async () => {
    const name = newMemberName.trim();
    if (!name) {
      setAddError('Member name is required');
      return;
    }

    const upi = newMemberUpi.trim();
    if (upi && !isValidUpiId(upi)) {
      setAddError('Invalid UPI ID format (e.g. name@oksbi)');
      return;
    }

    setAdding(true);
    setAddError('');
    try {
      const newMember: TripMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        upiId: upi || undefined,
        role: 'MEMBER',
        joinedAt: Date.now(),
        totalPaid: 0,
        totalShare: 0,
        netBalance: 0,
      };
      await addMember(trip.id, newMember);
      setAddDialogVisible(false);
      setNewMemberName('');
      setNewMemberUpi('');
    } catch (err: any) {
      setAddError(err.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleOpenEditUpi = (member: TripMember) => {
    setEditUpiMember(member);
    setEditUpiText(member.upiId || '');
    setUpiError('');
  };

  const handleSaveUpi = async () => {
    if (!editUpiMember) return;
    const trimmed = editUpiText.trim();
    if (trimmed && !isValidUpiId(trimmed)) {
      setUpiError('Invalid UPI ID format (e.g. name@oksbi)');
      return;
    }

    setSavingUpi(true);
    setUpiError('');
    try {
      const updatedMembers = trip.members.map((m) =>
        m.id === editUpiMember.id ? { ...m, upiId: trimmed || undefined } : m
      );
      await updateTrip(trip.id, { members: updatedMembers });
      setEditUpiMember(null);
      setEditUpiText('');
    } catch (err: any) {
      setUpiError(err.message || 'Failed to update UPI ID');
    } finally {
      setSavingUpi(false);
    }
  };

  const handleRemoveMember = (member: TripMember) => {
    if (member.role === 'CREATOR' || member.id === trip.createdBy || member.userId === trip.createdBy) {
      Alert.alert('Cannot Remove', 'The trip organizer cannot be removed.');
      return;
    }
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.name} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(trip.id, member.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Group Members"
        subtitle={trip.title}
        showBack
        fallbackRoute={`/trip/${trip.id}`}
        onBackPress={() => safeGoBack(router, `/trip/${trip.id}`)}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              setAddError('');
              setAddDialogVisible(true);
            }}
            style={styles.addHeaderBtn}
            accessibilityLabel="Add Member"
          >
            <MaterialCommunityIcons name="account-plus" size={18} color={M3Colors.primary} />
            <Text style={styles.addHeaderText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconCircle}>
            <MaterialCommunityIcons name="account-group" size={24} color={M3Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>
              {trip.members.length} Total Member{trip.members.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.infoSubtitle}>
              Manage member names, link UPI IDs for easy settlement, and track balances directly.
            </Text>
          </View>
        </View>

        {/* Member Cards */}
        <View style={styles.listSection}>
          {trip.members.map((member) => {
            const bal = memberBalances.find((b) => b.memberId === member.id);
            const net = bal ? bal.netBalance : member.netBalance || 0;
            const paid = bal ? bal.totalPaid : member.totalPaid || 0;
            const share = bal ? bal.totalShare : member.totalShare || 0;
            const isCreator =
              member.role === 'CREATOR' ||
              member.id === trip.createdBy ||
              member.userId === trip.createdBy;

            return (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberTopRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.memberInfoCol}>
                    <View style={styles.nameRoleRow}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <View
                        style={[
                          styles.roleBadge,
                          isCreator ? styles.roleCreator : styles.roleMember,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            isCreator ? styles.roleTextCreator : styles.roleTextMember,
                          ]}
                        >
                          {isCreator ? 'ORGANIZER' : 'MEMBER'}
                        </Text>
                      </View>
                    </View>

                    {member.upiId ? (
                      <TouchableOpacity
                        style={styles.upiRow}
                        onPress={() => handleOpenEditUpi(member)}
                      >
                        <MaterialCommunityIcons name="bank-transfer" size={14} color={M3Colors.primary} />
                        <Text style={styles.memberUpiText}>{member.upiId}</Text>
                        <MaterialCommunityIcons name="pencil-outline" size={12} color={M3Colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.upiRowAdd}
                        onPress={() => handleOpenEditUpi(member)}
                      >
                        <MaterialCommunityIcons name="plus-circle-outline" size={13} color={M3Colors.primary} />
                        <Text style={styles.addUpiLink}>Add UPI ID</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <StatusBadge amount={net} currency={baseCurrency} />
                </View>

                <View style={styles.memberStatsDivider} />

                <View style={styles.memberStatsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>PAID</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(paid, baseCurrency, false)}
                    </Text>
                  </View>

                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>SHARE</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(share, baseCurrency, false)}
                    </Text>
                  </View>

                  <View style={styles.actionsCol}>
                    <TouchableOpacity
                      style={styles.editUpiBtn}
                      onPress={() => handleOpenEditUpi(member)}
                    >
                      <MaterialCommunityIcons name="credit-card-outline" size={16} color={M3Colors.primary} />
                      <Text style={styles.editUpiBtnText}>UPI</Text>
                    </TouchableOpacity>

                    {!isCreator && (
                      <TouchableOpacity
                        style={styles.removeMemberBtn}
                        onPress={() => handleRemoveMember(member)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color={M3Colors.error} />
                        <Text style={styles.removeMemberText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Add Member Dialog */}
      <Portal>
        <Dialog
          visible={addDialogVisible}
          onDismiss={() => setAddDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Add New Member</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="Member Name *"
              value={newMemberName}
              onChangeText={(t) => {
                setNewMemberName(t);
                setAddError('');
              }}
              mode="outlined"
              outlineColor={M3Colors.outline}
              activeOutlineColor={M3Colors.primary}
              placeholder="e.g. Rahul Sharma"
              autoFocus
            />

            <TextInput
              label="UPI ID (Optional)"
              value={newMemberUpi}
              onChangeText={(t) => {
                setNewMemberUpi(t);
                setAddError('');
              }}
              mode="outlined"
              outlineColor={M3Colors.outline}
              activeOutlineColor={M3Colors.primary}
              placeholder="e.g. rahul@oksbi"
              autoCapitalize="none"
              autoCorrect={false}
              right={
                <TextInput.Icon
                  icon="qrcode-scan"
                  color={M3Colors.primary}
                  onPress={() => setScannerMode('add')}
                />
              }
            />


            {addError ? (
              <Text style={styles.dialogErrorText}>{addError}</Text>
            ) : null}
          </Dialog.Content>

          <Dialog.Actions>
            <Button
              onPress={() => setAddDialogVisible(false)}
              textColor={M3Colors.onSurfaceVariant}
            >
              Cancel
            </Button>
            <Button
              onPress={handleAddMember}
              loading={adding}
              disabled={adding}
              textColor={M3Colors.primary}
            >
              Add Member
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit UPI Dialog */}
      <Portal>
        <Dialog
          visible={Boolean(editUpiMember)}
          onDismiss={() => setEditUpiMember(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            Edit UPI ID — {editUpiMember?.name}
          </Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="UPI ID"
              value={editUpiText}
              onChangeText={(t) => {
                setEditUpiText(t);
                setUpiError('');
              }}
              mode="outlined"
              outlineColor={M3Colors.outline}
              activeOutlineColor={M3Colors.primary}
              placeholder="e.g. member@okaxis"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              right={
                <TextInput.Icon
                  icon="qrcode-scan"
                  color={M3Colors.primary}
                  onPress={() => setScannerMode('edit')}
                />
              }
            />


            {upiError ? (
              <Text style={styles.dialogErrorText}>{upiError}</Text>
            ) : (
              <Text style={styles.dialogHintText}>
                Leave empty to remove the UPI ID for this member.
              </Text>
            )}
          </Dialog.Content>

          <Dialog.Actions>
            <Button
              onPress={() => setEditUpiMember(null)}
              textColor={M3Colors.onSurfaceVariant}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSaveUpi}
              loading={savingUpi}
              disabled={savingUpi}
              textColor={M3Colors.primary}
            >
              Save UPI
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* UPI QR Scanner Modal */}
      <UpiScannerModal
        visible={Boolean(scannerMode)}
        onClose={() => setScannerMode(null)}
        title={
          scannerMode === 'edit'
            ? `Scan ${editUpiMember?.name || 'Friend'}'s UPI QR`
            : "Scan Friend's UPI QR"
        }
        friendName={scannerMode === 'edit' ? editUpiMember?.name : newMemberName}
        onScanned={(scannedUpi, payeeName) => {
          if (scannerMode === 'add') {
            setNewMemberUpi(scannedUpi);
            if (!newMemberName.trim() && payeeName) {
              setNewMemberName(payeeName);
            }
          } else if (scannerMode === 'edit') {
            setEditUpiText(scannedUpi);
          }
          setScannerMode(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: M3Colors.surface,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    gap: 4,
  },
  addHeaderText: {
    ...M3Typography.labelSm,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: M3Shapes.spacing.md,
    gap: 12,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardMedium,
    padding: M3Shapes.spacing.md,
    gap: 12,
  },
  infoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    ...M3Typography.titleSmall,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  infoSubtitle: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  listSection: {
    gap: 10,
  },
  memberCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardMedium,
    padding: M3Shapes.spacing.md,
    borderWidth: 1,
    borderColor: M3Colors.surfaceVariant,
    gap: 10,
  },
  memberTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    ...M3Typography.titleMedium,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  memberInfoCol: {
    flex: 1,
    gap: 2,
  },
  nameRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    ...M3Typography.bodyLarge,
    fontWeight: '600',
    color: M3Colors.onSurface,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  roleCreator: {
    backgroundColor: M3Colors.primaryContainer,
  },
  roleMember: {
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  roleBadgeText: {
    ...M3Typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roleTextCreator: {
    color: M3Colors.primary,
  },
  roleTextMember: {
    color: M3Colors.onSurfaceVariant,
  },
  upiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  upiRowAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberUpiText: {
    ...M3Typography.bodySmall,
    color: M3Colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  addUpiLink: {
    ...M3Typography.bodySmall,
    color: M3Colors.primary,
    fontSize: 12,
  },
  memberStatsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: M3Colors.surfaceVariant,
  },
  memberStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    gap: 2,
  },
  statLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValue: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editUpiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: M3Shapes.pill,
    gap: 4,
  },
  editUpiBtnText: {
    ...M3Typography.labelSm,
    color: M3Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  removeMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: M3Shapes.pill,
    gap: 4,
  },
  removeMemberText: {
    ...M3Typography.labelSm,
    color: M3Colors.error,
    fontSize: 11,
    fontWeight: '600',
  },
  dialog: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.modal,
  },
  dialogTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  dialogErrorText: {
    ...M3Typography.bodySmall,
    color: M3Colors.error,
  },
  dialogHintText: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
  },
  scanQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: M3Colors.primaryContainer,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: M3Shapes.small,
    marginTop: 2,
  },
  scanQuickText: {
    ...M3Typography.labelMedium,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
});
