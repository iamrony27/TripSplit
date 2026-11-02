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
import { ExpenseTile } from '../../src/components/expense/ExpenseTile';
import { TripMember } from '../../src/types/trip';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { formatCurrency } from '../../src/services/currency/exchangeRateService';
import { isValidUpiId } from '../../src/services/upi/upiParser';

export default function TripDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    trips,
    expenses,
    memberBalances,
    totalTripSpend,
    payments,
    isTripAdmin,
    addMember,
    removeMember,
    deleteExpense,
  } = useTrips();

  const trip = trips.find((t) => t.id === id);

  const [addMemberDialogVisible, setAddMemberDialogVisible] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUpi, setNewMemberUpi] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const tripApprovedPayments = payments.filter(
    (p) =>
      (p.tripId === trip?.id || p.groupId === trip?.id) &&
      (p.status === 'APPROVED' || p.status === 'PAID')
  );
  const totalApprovedAmount = tripApprovedPayments.reduce((acc, p) => acc + p.amount, 0);

  const tripPendingApprovals = payments.filter(
    (p) =>
      (p.tripId === trip?.id || p.groupId === trip?.id) &&
      (p.status === 'PENDING_ADMIN_APPROVAL' || p.status === 'PENDING')
  );

  if (!trip) {
    return (
      <View style={styles.container}>
        <TopAppBar title="Trip Not Found" showBack onBackPress={() => router.back()} />
        <View style={styles.notFoundCenter}>
          <Text style={styles.notFoundText}>This trip could not be found.</Text>
          <Button mode="contained" onPress={() => router.replace('/(tabs)/trips')}>
            Return to Trips
          </Button>
        </View>
      </View>
    );
  }

  const baseCurrency = trip.baseCurrency || 'INR';

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      setErrorMsg('Please enter member name.');
      return;
    }
    if (newMemberUpi.trim() && !isValidUpiId(newMemberUpi.trim())) {
      setErrorMsg('Invalid UPI address format.');
      return;
    }

    setAddingMember(true);
    setErrorMsg('');
    try {
      const newMember: TripMember = {
        id: `member_${Date.now()}`,
        name: newMemberName.trim(),
        upiId: newMemberUpi.trim() || undefined,
        totalPaid: 0,
        totalShare: 0,
        netBalance: 0,
      };
      await addMember(trip.id, newMember);
      setNewMemberName('');
      setNewMemberUpi('');
      setAddMemberDialogVisible(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteExpense = (expId: string, title: string) => {
    Alert.alert('Delete Expense', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(expId);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title={trip.title}
        subtitle={`${baseCurrency} • ${trip.members.length} Members`}
        showBack
        onBackPress={() => router.back()}
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/trip/settle')}
            style={styles.settleIconBtn}
          >
            <MaterialCommunityIcons name="hand-coin" size={20} color={M3Colors.secondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Pending Approval Banner for Group / Admin */}
        {tripPendingApprovals.length > 0 && (
          <TouchableOpacity
            style={styles.pendingAdminBanner}
            onPress={() => router.push('/trip/settle')}
            activeOpacity={0.8}
          >
            <View style={styles.pendingAdminIconCircle}>
              <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#E65100" />
            </View>
            <View style={styles.pendingAdminTextCol}>
              <Text style={styles.pendingAdminTitle}>
                {tripPendingApprovals.length} Payment Declaration{tripPendingApprovals.length > 1 ? 's' : ''} Pending
              </Text>
              <Text style={styles.pendingAdminSubtitle}>
                {isTripAdmin
                  ? 'Tap to review and verify in your bank account.'
                  : 'Awaiting Group Admin verification.'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#E65100" />
          </TouchableOpacity>
        )}

        {/* Hero Financial Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>TOTAL TRIP EXPENSES</Text>
              <Text style={styles.heroAmount}>
                {formatCurrency(totalTripSpend, baseCurrency)}
              </Text>
            </View>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>{baseCurrency}</Text>
            </View>
          </View>

          {trip.description ? (
            <Text style={styles.heroDescription}>{trip.description}</Text>
          ) : null}

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <Button
              mode="contained"
              onPress={() => router.push('/trip/add-expense')}
              icon="plus"
              buttonColor={M3Colors.primary}
              style={styles.actionBtn}
            >
              Add Expense
            </Button>
            <Button
              mode="contained"
              onPress={() => router.push('/trip/settle')}
              icon="hand-coin"
              buttonColor={M3Colors.secondary}
              style={styles.actionBtn}
            >
              Smart Settle
            </Button>
          </View>
        </View>

        {/* Group Settlement Status Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons name="shield-check" size={18} color={M3Colors.primary} />
              <Text style={styles.cardTitle}>Settlement Status</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/trip/settle')}>
              <Text style={styles.addExpenseLink}>Settle Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settlementSummaryRow}>
            <View style={styles.settlementSummaryCol}>
              <Text style={styles.settlementColLabel}>TOTAL APPROVED</Text>
              <Text style={[styles.settlementColAmount, { color: M3Colors.primary }]}>
                {formatCurrency(totalApprovedAmount, baseCurrency)}
              </Text>
              <Text style={styles.settlementColSub}>
                {tripApprovedPayments.length} payment{tripApprovedPayments.length !== 1 ? 's' : ''} settled
              </Text>
            </View>

            <View style={styles.settlementColDivider} />

            <View style={styles.settlementSummaryCol}>
              <Text style={styles.settlementColLabel}>PENDING APPROVAL</Text>
              <Text
                style={[
                  styles.settlementColAmount,
                  { color: tripPendingApprovals.length > 0 ? '#E65100' : M3Colors.onSurfaceVariant },
                ]}
              >
                {tripPendingApprovals.length}
              </Text>
              <Text style={styles.settlementColSub}>
                {tripPendingApprovals.length > 0 ? 'Requires action' : 'All up to date'}
              </Text>
            </View>
          </View>
        </View>

        {/* Member Balances Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Member Balances</Text>
            <TouchableOpacity
              onPress={() => setAddMemberDialogVisible(true)}
              style={styles.addMemberHeaderBtn}
            >
              <MaterialCommunityIcons name="account-plus" size={16} color={M3Colors.primary} />
              <Text style={styles.addMemberHeaderText}>Add Member</Text>
            </TouchableOpacity>
          </View>

          {trip.members.map((member) => {
            const bal = memberBalances.find((b) => b.memberId === member.id);
            const net = bal ? bal.netBalance : 0;
            const paid = bal ? bal.totalPaid : 0;
            const share = bal ? bal.totalShare : 0;

            return (
              <View key={member.id} style={styles.memberBalanceRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarInitial}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.memberDetails}>
                  <Text style={styles.memberNameText}>{member.name}</Text>
                  <Text style={styles.memberSubText}>
                    Paid: {formatCurrency(paid, baseCurrency, false)} • Share: {formatCurrency(share, baseCurrency, false)}
                  </Text>
                  {member.upiId ? (
                    <Text style={styles.memberUpiText}>{member.upiId}</Text>
                  ) : null}
                </View>

                <StatusBadge amount={net} currency={baseCurrency} />
              </View>
            );
          })}
        </View>

        {/* Expenses List Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Expenses ({expenses.length})</Text>
            <TouchableOpacity onPress={() => router.push('/trip/add-expense')}>
              <Text style={styles.addExpenseLink}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {expenses.length === 0 ? (
            <View style={styles.emptyExpenses}>
              <MaterialCommunityIcons name="receipt" size={40} color={M3Colors.onSurfaceVariant} />
              <Text style={styles.emptyExpensesText}>No expenses recorded yet</Text>
            </View>
          ) : (
            expenses.map((expense) => {
              const payer = trip.members.find((m) => m.id === expense.paidByMemberId)?.name;
              return (
                <View key={expense.id} style={styles.expenseWrapper}>
                  <View style={{ flex: 1 }}>
                    <ExpenseTile
                      expense={expense}
                      payerName={payer}
                      onPress={() => handleDeleteExpense(expense.id, expense.title)}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Member Dialog */}
      <Portal>
        <Dialog
          visible={addMemberDialogVisible}
          onDismiss={() => setAddMemberDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Add Member to Trip</Dialog.Title>
          <Dialog.Content>
            {errorMsg ? <Text style={styles.dialogError}>{errorMsg}</Text> : null}
            <TextInput
              label="Member Name *"
              value={newMemberName}
              onChangeText={(t) => {
                setNewMemberName(t);
                if (errorMsg) setErrorMsg('');
              }}
              mode="outlined"
              style={{ marginBottom: 10 }}
              outlineColor={M3Colors.outlineVariant}
              activeOutlineColor={M3Colors.primary}
            />
            <TextInput
              label="UPI ID (optional)"
              placeholder="e.g. friend@okhdfcbank"
              value={newMemberUpi}
              onChangeText={(t) => {
                setNewMemberUpi(t);
                if (errorMsg) setErrorMsg('');
              }}
              mode="outlined"
              outlineColor={M3Colors.outlineVariant}
              activeOutlineColor={M3Colors.primary}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddMemberDialogVisible(false)} textColor={M3Colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Button
              onPress={handleAddMember}
              loading={addingMember}
              disabled={addingMember}
              textColor={M3Colors.primary}
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  notFoundCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  notFoundText: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
  },
  settleIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: M3Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: M3Colors.primaryContainer,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    letterSpacing: 1,
    fontWeight: '700',
  },
  heroAmount: {
    ...M3Typography.headlineLg,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
    marginTop: 4,
  },
  currencyBadge: {
    backgroundColor: 'rgba(0, 33, 20, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: M3Shapes.pill,
  },
  currencyBadgeText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
  },
  heroDescription: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onPrimaryContainer,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: M3Shapes.pill,
  },
  card: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  addMemberHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMemberHeaderText: {
    ...M3Typography.labelSm,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  memberBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: M3Colors.outlineVariant,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberAvatarInitial: {
    ...M3Typography.labelLg,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  memberDetails: {
    flex: 1,
  },
  memberNameText: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  memberSubText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  memberUpiText: {
    ...M3Typography.bodySm,
    color: M3Colors.secondary,
    fontSize: 11,
  },
  addExpenseLink: {
    ...M3Typography.labelMd,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  emptyExpenses: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyExpensesText: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
  },
  expenseWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
  },
  dialogTitle: {
    ...M3Typography.titleLarge,
    color: M3Colors.onSurface,
  },
  dialogError: {
    ...M3Typography.bodySm,
    color: M3Colors.error,
    marginBottom: 8,
  },
  pendingAdminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: M3Shapes.cardMedium,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    gap: 12,
    marginBottom: 4,
    elevation: 2,
  },
  pendingAdminIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE082',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAdminTextCol: {
    flex: 1,
  },
  pendingAdminTitle: {
    ...M3Typography.titleSm,
    color: '#E65100',
    fontWeight: '800',
  },
  pendingAdminSubtitle: {
    ...M3Typography.bodySm,
    color: '#BF360C',
    fontSize: 11,
    marginTop: 2,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settlementSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: 12,
    marginTop: 8,
  },
  settlementSummaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  settlementColLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  settlementColAmount: {
    ...M3Typography.titleMedium,
    fontWeight: '800',
  },
  settlementColSub: {
    fontSize: 10,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  settlementColDivider: {
    width: 1,
    height: 32,
    backgroundColor: M3Colors.outlineVariant,
    opacity: 0.5,
  },
});
