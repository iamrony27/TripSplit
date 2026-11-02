import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Button, Dialog, Portal, TextInput, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTrips } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { GroupInviteModal } from '../../src/components/trip/GroupInviteModal';
import { MemberMergeModal } from '../../src/components/trip/MemberMergeModal';
import { MemberRole, TripMember } from '../../src/types/trip';
import { JoinRequest } from '../../src/types/joinRequest';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { formatCurrency } from '../../src/services/currency/exchangeRateService';
import { safeGoBack } from '../../src/utils/navigation';

export default function TripMembersScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const {
    trips,
    joinRequests,
    memberBalances,
    isTripAdmin,
    isGroupOwner,
    approveJoinRequest,
    rejectJoinRequest,
    removeMember,
  } = useTrips();

  const trip = trips.find((t) => t.id === id) || trips[0];

  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);

  // Approval dialog state
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [approveRole, setApproveRole] = useState<MemberRole>('MEMBER');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);

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
  const pendingRequests = joinRequests.filter((r) => r.status === 'PENDING');

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setApproving(true);
    try {
      await approveJoinRequest(selectedRequest, approveRole);
      Alert.alert('Approved', `${selectedRequest.applicantName} has been added as a ${approveRole.toLowerCase()}.`);
      setSelectedRequest(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve join request');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setRejecting(true);
    try {
      await rejectJoinRequest(selectedRequest, rejectReason.trim() || undefined);
      Alert.alert('Request Rejected', `Join request from ${selectedRequest.applicantName} was rejected.`);
      setSelectedRequest(null);
      setRejectDialogVisible(false);
      setRejectReason('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject request');
    } finally {
      setRejecting(false);
    }
  };

  const handleRemoveMember = (member: TripMember) => {
    if (member.role === 'CREATOR') {
      Alert.alert('Cannot Remove', 'The trip creator cannot be removed.');
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
          isTripAdmin ? (
            <TouchableOpacity
              onPress={() => setInviteModalVisible(true)}
              style={styles.inviteIconBtn}
              accessibilityLabel="Invite to Group"
            >
              <MaterialCommunityIcons name="qrcode-scan" size={20} color={M3Colors.primary} />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'members' && styles.tabBtnActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'members' && styles.tabBtnTextActive]}>
            Members ({trip.members.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'requests' && styles.tabBtnActive]}
          onPress={() => setActiveTab('requests')}
        >
          <View style={styles.tabBadgeRow}>
            <Text style={[styles.tabBtnText, activeTab === 'requests' && styles.tabBtnTextActive]}>
              Join Requests
            </Text>
            {pendingRequests.length > 0 && (
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>{pendingRequests.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'members' && (
          <>
            {/* Admin Action Bar */}
            {isTripAdmin && (
              <View style={styles.adminActionCard}>
                <View style={styles.adminActionInfo}>
                  <MaterialCommunityIcons name="shield-account" size={24} color={M3Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminActionTitle}>Admin Management</Text>
                    <Text style={styles.adminActionSub}>
                      Invite via QR code or merge duplicate offline placeholders.
                    </Text>
                  </View>
                </View>

                <View style={styles.adminActionButtonsRow}>
                  <Button
                    mode="contained"
                    icon="qrcode"
                    buttonColor={M3Colors.primary}
                    textColor={M3Colors.onPrimary}
                    onPress={() => setInviteModalVisible(true)}
                    style={{ flex: 1 }}
                  >
                    Invite QR
                  </Button>

                  <Button
                    mode="outlined"
                    icon="account-switch"
                    textColor={M3Colors.primary}
                    style={{ flex: 1, borderColor: M3Colors.primary }}
                    onPress={() => setMergeModalVisible(true)}
                  >
                    Consolidate
                  </Button>
                </View>
              </View>
            )}

            {/* Members List */}
            <View style={styles.listSection}>
              {trip.members.map((member) => {
                const bal = memberBalances.find((b) => b.memberId === member.id);
                const net = bal ? bal.netBalance : member.netBalance || 0;
                const paid = bal ? bal.totalPaid : member.totalPaid || 0;
                const share = bal ? bal.totalShare : member.totalShare || 0;
                const role =
                  member.role ||
                  (member.id === trip.createdBy || member.userId === trip.createdBy
                    ? 'CREATOR'
                    : 'MEMBER');

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
                          <Text style={styles.memberName}>{member.name}</Text>
                          <View
                            style={[
                              styles.roleBadge,
                              role === 'CREATOR'
                                ? styles.roleCreator
                                : role === 'ADMIN'
                                ? styles.roleAdmin
                                : styles.roleMember,
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleBadgeText,
                                role === 'CREATOR'
                                  ? styles.roleTextCreator
                                  : role === 'ADMIN'
                                  ? styles.roleTextAdmin
                                  : styles.roleTextMember,
                              ]}
                            >
                              {role}
                            </Text>
                          </View>
                        </View>

                        {member.email ? (
                          <Text style={styles.memberSubText}>{member.email}</Text>
                        ) : null}
                        {member.upiId ? (
                          <Text style={styles.memberUpiText}>UPI: {member.upiId}</Text>
                        ) : null}
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

                      {isTripAdmin && role !== 'CREATOR' && (
                        <TouchableOpacity
                          style={styles.removeMemberBtn}
                          onPress={() => handleRemoveMember(member)}
                        >
                          <MaterialCommunityIcons name="account-remove-outline" size={18} color={M3Colors.error} />
                          <Text style={styles.removeMemberText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {activeTab === 'requests' && (
          <View style={styles.requestsSection}>
            {joinRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="account-clock-outline" size={48} color={M3Colors.onSurfaceVariant} />
                <Text style={styles.emptyTitle}>No Join Requests</Text>
                <Text style={styles.emptySubtitle}>
                  When new members scan your group QR code or enter your invite code, their join requests will appear here for admin approval.
                </Text>
              </View>
            ) : (
              joinRequests.map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestHeaderRow}>
                    <View style={styles.requestAvatar}>
                      <Text style={styles.requestAvatarText}>
                        {req.applicantName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.requestInfoCol}>
                      <Text style={styles.requestName}>{req.applicantName}</Text>
                      {req.applicantPhone ? (
                        <Text style={styles.requestSub}>📱 {req.applicantPhone}</Text>
                      ) : null}
                      {req.applicantEmail ? (
                        <Text style={styles.requestSub}>✉️ {req.applicantEmail}</Text>
                      ) : null}
                      {req.applicantUpiId ? (
                        <Text style={styles.requestSub}>UPI: {req.applicantUpiId}</Text>
                      ) : null}
                      <Text style={styles.requestDate}>
                        Requested {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.reqStatusBadge,
                        req.status === 'APPROVED'
                          ? styles.reqStatusApproved
                          : req.status === 'REJECTED'
                          ? styles.reqStatusRejected
                          : styles.reqStatusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reqStatusText,
                          req.status === 'APPROVED'
                            ? styles.reqStatusTextApproved
                            : req.status === 'REJECTED'
                            ? styles.reqStatusTextRejected
                            : styles.reqStatusTextPending,
                        ]}
                      >
                        {req.status}
                      </Text>
                    </View>
                  </View>

                  {req.status === 'PENDING' && isTripAdmin && (
                    <View style={styles.requestActionsRow}>
                      <Button
                        mode="outlined"
                        textColor={M3Colors.error}
                        style={{ flex: 1, borderColor: M3Colors.error }}
                        onPress={() => {
                          setSelectedRequest(req);
                          setRejectDialogVisible(true);
                        }}
                      >
                        Reject
                      </Button>

                      <Button
                        mode="contained"
                        buttonColor={M3Colors.primary}
                        textColor={M3Colors.onPrimary}
                        style={{ flex: 1 }}
                        onPress={() => {
                          setSelectedRequest(req);
                          setApproveRole('MEMBER');
                        }}
                      >
                        Approve
                      </Button>
                    </View>
                  )}

                  {req.rejectionReason && (
                    <Text style={styles.rejectionReasonText}>
                      Reason: {req.rejectionReason}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Role Picker Approval Dialog */}
      <Portal>
        <Dialog
          visible={Boolean(selectedRequest && !rejectDialogVisible)}
          onDismiss={() => setSelectedRequest(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Approve Join Request</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogSubtitle}>
              Assign a role for {selectedRequest?.applicantName} in this trip:
            </Text>

            <View style={styles.roleChipsRow}>
              {(['MEMBER', 'ADMIN', 'VIEWER'] as MemberRole[]).map((r) => (
                <Chip
                  key={r}
                  selected={approveRole === r}
                  onPress={() => setApproveRole(r)}
                  style={[
                    styles.roleChip,
                    approveRole === r && styles.roleChipSelected,
                  ]}
                  textStyle={approveRole === r ? styles.roleChipTextSelected : styles.roleChipText}
                >
                  {r}
                </Chip>
              ))}
            </View>

            <Text style={styles.roleExplainer}>
              {approveRole === 'ADMIN'
                ? 'Can edit transactions, approve join requests, and consolidate member profiles.'
                : approveRole === 'VIEWER'
                ? 'Can view group balances and expenses in read-only mode.'
                : 'Can add expenses, declare settlements, and view balances.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelectedRequest(null)} textColor={M3Colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleApprove}
              loading={approving}
              disabled={approving}
              buttonColor={M3Colors.primary}
            >
              Confirm Approval
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Reject Request Dialog */}
      <Portal>
        <Dialog
          visible={rejectDialogVisible}
          onDismiss={() => {
            setRejectDialogVisible(false);
            setSelectedRequest(null);
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Reject Request</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogSubtitle}>
              Are you sure you want to reject {selectedRequest?.applicantName}'s request to join?
            </Text>
            <TextInput
              label="Rejection Reason (optional)"
              placeholder="e.g. Unknown person or accidental request"
              value={rejectReason}
              onChangeText={setRejectReason}
              mode="outlined"
              style={{ marginTop: 12 }}
              outlineColor={M3Colors.outlineVariant}
              activeOutlineColor={M3Colors.error}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setRejectDialogVisible(false);
                setSelectedRequest(null);
              }}
              textColor={M3Colors.onSurfaceVariant}
            >
              Cancel
            </Button>
            <Button
              textColor={M3Colors.error}
              onPress={handleReject}
              loading={rejecting}
              disabled={rejecting}
            >
              Reject
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Group Invite Modal (QR & Code) */}
      <GroupInviteModal
        visible={inviteModalVisible}
        tripId={trip.id}
        tripTitle={trip.title}
        onDismiss={() => setInviteModalVisible(false)}
      />

      {/* Profile Merge Modal (Admin only) */}
      <MemberMergeModal
        visible={mergeModalVisible}
        trip={trip}
        onDismiss={() => setMergeModalVisible(false)}
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
  inviteIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: M3Colors.surfaceContainerLow,
    marginHorizontal: M3Shapes.spacing.md,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: M3Shapes.pill,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: M3Shapes.pill,
  },
  tabBtnActive: {
    backgroundColor: M3Colors.surface,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabBtnText: {
    ...M3Typography.labelLarge,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: M3Colors.primary,
    fontWeight: '700',
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgePill: {
    backgroundColor: '#E65100',
    borderRadius: M3Shapes.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgePillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    padding: M3Shapes.spacing.md,
    paddingBottom: 40,
    gap: 12,
  },
  adminActionCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
    gap: 12,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  adminActionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminActionTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  adminActionSub: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  adminActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  listSection: {
    gap: 10,
  },
  memberCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
  },
  nameRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  roleCreator: {
    backgroundColor: '#EDE7F6',
  },
  roleAdmin: {
    backgroundColor: '#E0F2FE',
  },
  roleMember: {
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleTextCreator: {
    color: '#5E35B1',
  },
  roleTextAdmin: {
    color: '#0284C7',
  },
  roleTextMember: {
    color: M3Colors.onSurfaceVariant,
  },
  memberSubText: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    marginTop: 1,
  },
  memberUpiText: {
    ...M3Typography.bodySmall,
    color: M3Colors.primary,
    marginTop: 2,
  },
  memberStatsDivider: {
    height: 1,
    backgroundColor: M3Colors.outlineVariant,
    opacity: 0.6,
    marginVertical: 10,
  },
  memberStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    ...M3Typography.labelSmall,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statValue: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
    marginTop: 1,
  },
  removeMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: M3Shapes.input,
  },
  removeMemberText: {
    ...M3Typography.bodySmall,
    color: M3Colors.error,
    fontWeight: '600',
  },
  requestsSection: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
    gap: 12,
    elevation: 1,
  },
  requestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE0B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAvatarText: {
    ...M3Typography.titleMedium,
    color: '#E65100',
    fontWeight: '700',
  },
  requestInfoCol: {
    flex: 1,
  },
  requestName: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  requestSub: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
  },
  requestDate: {
    ...M3Typography.labelSmall,
    color: M3Colors.outline,
    marginTop: 2,
  },
  reqStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: M3Shapes.pill,
  },
  reqStatusPending: {
    backgroundColor: '#FFF3E0',
  },
  reqStatusApproved: {
    backgroundColor: '#E8F5E9',
  },
  reqStatusRejected: {
    backgroundColor: '#FFEBEE',
  },
  reqStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reqStatusTextPending: {
    color: '#E65100',
  },
  reqStatusTextApproved: {
    color: '#2E7D32',
  },
  reqStatusTextRejected: {
    color: '#C62828',
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rejectionReasonText: {
    ...M3Typography.bodySmall,
    color: M3Colors.error,
    fontStyle: 'italic',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  dialog: {
    backgroundColor: M3Colors.surface,
    borderRadius: M3Shapes.modal,
  },
  dialogTitle: {
    ...M3Typography.headlineSmall,
    color: M3Colors.onSurface,
  },
  dialogSubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    marginBottom: 12,
  },
  roleChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  roleChip: {
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  roleChipSelected: {
    backgroundColor: M3Colors.primaryContainer,
  },
  roleChipText: {
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  roleChipTextSelected: {
    color: M3Colors.primary,
    fontWeight: '700',
  },
  roleExplainer: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
