import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import { TextInput, Button, Checkbox, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTrips } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { CategoryPicker } from '../../src/components/expense/CategoryPicker';
import { DatePickerField } from '../../src/components/common/DatePickerModal';
import { SegmentedPills } from '../../src/components/common/SegmentedPills';
import { SplitMode, ParticipantSplit } from '../../src/types/expense';
import { TransactionEditRecord } from '../../src/types/editHistory';
import { subscribeExpenseEditHistory } from '../../src/services/firebase/expenseEditService';
import { formatCurrency } from '../../src/services/currency/exchangeRateService';
import { calculateExpenseShares, round2 } from '../../src/engine/expenseCalculator';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { useKeyboardBottomInset } from '../../src/hooks/useKeyboardBottomInset';
import { safeGoBack } from '../../src/utils/navigation';
import { suggestCategoryFromTitle, getSmartSuggestions, SmartExpenseSuggestion } from '../../src/services/expense/categorySuggestor';

export default function EditExpenseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { expenseId, tripId } = useLocalSearchParams<{ expenseId: string; tripId?: string }>();
  const { trips, expenses, adminEditExpense, isTripAdmin } = useTrips();

  const expense = expenses.find((e) => e.id === expenseId);
  const trip = trips.find((t) => t.id === (tripId || expense?.tripId)) || trips[0];

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const keyboardInset = useKeyboardBottomInset(80);

  // Form State initialized from existing expense
  const [title, setTitle] = useState(expense?.title || '');
  const [amountStr, setAmountStr] = useState(expense ? String(expense.amount) : '');
  const [categoryId, setCategoryId] = useState(expense?.categoryId || 'food');
  const [paidByMemberId, setPaidByMemberId] = useState(expense?.paidByMemberId || '');
  const [splitMode, setSplitMode] = useState<SplitMode>(expense?.splitMode || 'EQUALLY');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    expense?.selectedParticipantIds || trip?.members.map((m) => m.id) || []
  );
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [expenseDate, setExpenseDate] = useState(
    expense?.expenseDate || new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState(expense?.description || '');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-category suggestion
  const smartSuggestions = useMemo(() => getSmartSuggestions(title), [title]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (errorMsg) setErrorMsg('');
    const autoCat = suggestCategoryFromTitle(newTitle);
    if (autoCat) {
      setCategoryId(autoCat);
    }
  };

  const applySuggestion = (sug: SmartExpenseSuggestion) => {
    setTitle(sug.title);
    setCategoryId(sug.categoryId);
    if (errorMsg) setErrorMsg('');
  };

  // Edit history audit logs
  const [editHistory, setEditHistory] = useState<TransactionEditRecord[]>([]);

  useEffect(() => {
    if (expense) {
      setTitle(expense.title);
      setAmountStr(String(expense.amount));
      setCategoryId(expense.categoryId);
      setPaidByMemberId(expense.paidByMemberId);
      setSplitMode(expense.splitMode || 'EQUALLY');
      setSelectedMemberIds(expense.selectedParticipantIds || trip?.members.map((m) => m.id) || []);
      setExpenseDate(expense.expenseDate || new Date().toISOString().split('T')[0]);
      setDescription(expense.description || '');

      // Initialize custom splits if unequally / percent / shares
      if (expense.splitsData) {
        const splitsMap: Record<string, number> = {};
        expense.splitsData.forEach((s) => {
          if (s.customAmount !== undefined) splitsMap[s.memberId] = s.customAmount;
          else if (s.percentage !== undefined) splitsMap[s.memberId] = s.percentage;
          else if (s.shares !== undefined) splitsMap[s.memberId] = s.shares;
        });
        setCustomSplits(splitsMap);
      }
    }
  }, [expense, trip]);

  // Subscribe to edit audit logs
  useEffect(() => {
    if (!expenseId) return;
    const unsubscribe = subscribeExpenseEditHistory(expenseId, (records) => {
      setEditHistory(records);
    });
    return () => unsubscribe();
  }, [expenseId]);

  if (!expense || !trip) {
    return (
      <View style={styles.container}>
        <TopAppBar
          title="Edit Transaction"
          showBack
          fallbackRoute="/(tabs)"
          onBackPress={() => safeGoBack(router, '/(tabs)')}
        />
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={M3Colors.onSurfaceVariant} />
          <Text style={styles.errorText}>Transaction or trip not found.</Text>
          <Button mode="contained" onPress={() => safeGoBack(router, '/(tabs)')}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const baseCurrency = trip.baseCurrency || 'INR';
  const numAmount = parseFloat(amountStr) || 0;

  const splitOptions = [
    { value: 'EQUALLY' as SplitMode, label: 'Equally' },
    { value: 'UNEQUALLY' as SplitMode, label: 'Exact' },
    { value: 'PERCENTAGE' as SplitMode, label: 'Percent' },
    { value: 'BY_SHARES' as SplitMode, label: 'Shares' },
  ];

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length <= 1) {
          Alert.alert('Cannot Deselect', 'At least one participant must be included.');
          return prev;
        }
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const splitsDataList: ParticipantSplit[] = useMemo(() => {
    return trip.members.map((m) => {
      const val = customSplits[m.id] || 0;
      const isSelected = selectedMemberIds.includes(m.id);
      return {
        memberId: m.id,
        selected: isSelected,
        amount: 0,
        customAmount: splitMode === 'UNEQUALLY' ? val : undefined,
        percentage: splitMode === 'PERCENTAGE' ? val : undefined,
        shares: splitMode === 'BY_SHARES' ? val : undefined,
      };
    });
  }, [trip.members, selectedMemberIds, customSplits, splitMode]);

  const calculatedShares = useMemo(() => {
    if (numAmount <= 0 || selectedMemberIds.length === 0) return {};
    try {
      return calculateExpenseShares(
        numAmount,
        splitMode,
        selectedMemberIds,
        splitsDataList
      );
    } catch {
      return {};
    }
  }, [numAmount, splitMode, selectedMemberIds, splitsDataList]);

  const handleSaveEdit = async () => {
    if (!isTripAdmin) {
      Alert.alert('Permission Denied', 'Only trip administrators can edit transactions.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter transaction title.');
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }
    if (!paidByMemberId) {
      setErrorMsg('Please select who paid.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setErrorMsg('Please select at least one participant.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await adminEditExpense({
        expenseId: expense.id,
        reason: editReason.trim() || undefined,
        updates: {
          title: title.trim(),
          amount: numAmount,
          categoryId,
          paidByMemberId,
          selectedParticipantIds: selectedMemberIds,
          expenseDate,
          description: description.trim() || undefined,
          splitMode,
          splitsData: splitMode !== 'EQUALLY' ? splitsDataList : undefined,
        },
      });

      Alert.alert('Updated', 'Transaction has been updated with audit history.', [
        {
          text: 'OK',
          onPress: () => safeGoBack(router, `/trip/${trip.id}`),
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <TopAppBar
        title="Edit Transaction"
        subtitle={trip.title}
        showBack
        fallbackRoute={`/trip/${trip.id}`}
        onBackPress={() => safeGoBack(router, `/trip/${trip.id}`)}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardInset + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Admin Notice */}
        <View style={styles.adminBanner}>
          <MaterialCommunityIcons name="shield-edit-outline" size={20} color="#0284C7" />
          <View style={{ flex: 1 }}>
            <Text style={styles.adminBannerTitle}>Admin Edit & Audit Mode</Text>
            <Text style={styles.adminBannerText}>
              All modifications are logged with your name, timestamp, and audit history. Group balances will recalculate automatically.
            </Text>
          </View>
        </View>

        {errorMsg ? <Text style={styles.errorBanner}>{errorMsg}</Text> : null}

        {/* Hero Amount Input */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>AMOUNT ({baseCurrency})</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencyPrefix}>{baseCurrency}</Text>
            <RNTextInput
              style={styles.heroInput}
              value={amountStr}
              onChangeText={(text) => {
                setAmountStr(text);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="0.00"
              placeholderTextColor={M3Colors.outline}
              keyboardType="decimal-pad"
              autoFocus={false}
            />
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>

          <TextInput
            label="Title *"
            value={title}
            onChangeText={handleTitleChange}
            mode="outlined"
            style={styles.input}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
          />

          {/* Smart Quick Suggestions */}
          {smartSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsHeader}>
                <MaterialCommunityIcons name="lightning-bolt" size={13} color={M3Colors.primary} />
                <Text style={styles.suggestionsTitle}>Quick Suggestions</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsRow}
              >
                {smartSuggestions.map((sug, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => applySuggestion(sug)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionEmoji}>{sug.emoji}</Text>
                    <Text style={styles.suggestionText}>{sug.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ marginVertical: 4 }}>
            <CategoryPicker selectedCategoryId={categoryId} onSelectCategory={setCategoryId} />
          </View>

          <DatePickerField
            label="Expense Date"
            value={expenseDate}
            onChange={setExpenseDate}
            style={styles.input}
          />

          <TextInput
            label="Notes / Description (optional)"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
          />
        </View>

        {/* Paid By Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Paid By</Text>
          <View style={styles.membersGrid}>
            {trip.members.map((member) => {
              const isSelected = paidByMemberId === member.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.memberChip, isSelected && styles.memberChipSelected]}
                  onPress={() => setPaidByMemberId(member.id)}
                >
                  <View style={[styles.avatarMini, isSelected && styles.avatarMiniSelected]}>
                    <Text style={[styles.avatarMiniText, isSelected && styles.avatarMiniTextSelected]}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[styles.memberChipText, isSelected && styles.memberChipTextSelected]}
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Split Mode Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Split Mode</Text>
          <SegmentedPills
            options={splitOptions}
            selectedValue={splitMode}
            onSelect={(val) => setSplitMode(val as SplitMode)}
          />

          {/* Participants */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Included Participants ({selectedMemberIds.length}/{trip.members.length})
          </Text>

          {trip.members.map((member) => {
            const isIncluded = selectedMemberIds.includes(member.id);
            const share = calculatedShares[member.id] || 0;

            return (
              <View key={member.id} style={styles.participantRow}>
                <TouchableOpacity
                  style={styles.participantLeft}
                  onPress={() => toggleMember(member.id)}
                >
                  <Checkbox
                    status={isIncluded ? 'checked' : 'unchecked'}
                    onPress={() => toggleMember(member.id)}
                    color={M3Colors.primary}
                  />
                  <Text style={styles.participantName}>{member.name}</Text>
                </TouchableOpacity>

                {isIncluded && (
                  <View style={styles.participantRight}>
                    {splitMode !== 'EQUALLY' && (
                      <RNTextInput
                        style={styles.customSplitInput}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        value={customSplits[member.id] !== undefined ? String(customSplits[member.id]) : ''}
                        onChangeText={(txt) => {
                          const val = parseFloat(txt) || 0;
                          setCustomSplits((prev) => ({ ...prev, [member.id]: val }));
                        }}
                      />
                    )}
                    <Text style={styles.shareText}>
                      {formatCurrency(share, baseCurrency, false)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Reason for Edit */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Audit Log Reason</Text>
          <TextInput
            label="Reason for editing this transaction *"
            placeholder="e.g. Corrected mistyped total, updated payer"
            value={editReason}
            onChangeText={setEditReason}
            mode="outlined"
            style={styles.input}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
          />
        </View>

        {/* Save Button */}
        <Button
          mode="contained"
          buttonColor={M3Colors.primary}
          textColor={M3Colors.onPrimary}
          loading={saving}
          disabled={saving}
          onPress={handleSaveEdit}
          style={styles.saveBtn}
          contentStyle={{ height: 50 }}
        >
          Save & Apply Recalculation
        </Button>

        {/* Edit History Audit Trail */}
        <View style={styles.auditSection}>
          <View style={styles.auditHeaderRow}>
            <MaterialCommunityIcons name="history" size={20} color={M3Colors.primary} />
            <Text style={styles.auditSectionTitle}>
              Edit History & Audit Log ({editHistory.length})
            </Text>
          </View>

          {editHistory.length === 0 ? (
            <View style={styles.emptyAuditCard}>
              <Text style={styles.emptyAuditText}>
                This transaction has not been edited previously.
              </Text>
            </View>
          ) : (
            editHistory.map((record) => (
              <View key={record.id} style={styles.auditCard}>
                <View style={styles.auditTopRow}>
                  <View style={styles.auditAdminBadge}>
                    <MaterialCommunityIcons name="account-cog" size={14} color="#0284C7" />
                    <Text style={styles.auditAdminText}>{record.editedByName}</Text>
                  </View>
                  <Text style={styles.auditDateText}>
                    {new Date(record.editedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {record.reason ? (
                  <Text style={styles.auditReasonText}>
                    "{record.reason}"
                  </Text>
                ) : null}

                <View style={styles.auditComparisonRow}>
                  <View style={styles.auditCol}>
                    <Text style={styles.auditColLabel}>ORIGINAL</Text>
                    <Text style={styles.auditColValue}>
                      {record.originalTitle}
                    </Text>
                    <Text style={styles.auditColAmount}>
                      {formatCurrency(record.originalAmount, baseCurrency)}
                    </Text>
                  </View>

                  <MaterialCommunityIcons name="arrow-right-thin" size={20} color={M3Colors.outline} />

                  <View style={styles.auditCol}>
                    <Text style={styles.auditColLabel}>UPDATED</Text>
                    <Text style={styles.auditColValue}>
                      {record.updatedTitle}
                    </Text>
                    <Text style={[styles.auditColAmount, { color: M3Colors.primary }]}>
                      {formatCurrency(record.updatedAmount, baseCurrency)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    gap: 12,
  },
  errorText: {
    ...M3Typography.titleMedium,
    color: M3Colors.error,
  },
  scrollContent: {
    padding: M3Shapes.spacing.md,
    gap: 12,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E0F2FE',
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
  },
  adminBannerTitle: {
    ...M3Typography.labelLarge,
    color: '#0369A1',
    fontWeight: '700',
  },
  adminBannerText: {
    ...M3Typography.bodySmall,
    color: '#075985',
    marginTop: 2,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    color: M3Colors.error,
    padding: 10,
    borderRadius: M3Shapes.input,
    ...M3Typography.bodySmall,
    fontWeight: '600',
  },
  amountCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
    alignItems: 'center',
  },
  amountLabel: {
    ...M3Typography.labelSmall,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '700',
    letterSpacing: 1,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  currencyPrefix: {
    ...M3Typography.headlineMedium,
    color: M3Colors.primary,
    fontWeight: '700',
    marginRight: 6,
  },
  heroInput: {
    ...M3Typography.headlineLarge,
    color: M3Colors.onSurface,
    fontWeight: '800',
    minWidth: 100,
  },
  card: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: M3Shapes.spacing.md,
    gap: 10,
  },
  sectionTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  fieldLabel: {
    ...M3Typography.labelMedium,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: M3Colors.surface,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  memberChipSelected: {
    backgroundColor: M3Colors.primaryContainer,
  },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: M3Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniSelected: {
    backgroundColor: M3Colors.primary,
  },
  avatarMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: M3Colors.onSurfaceVariant,
  },
  avatarMiniTextSelected: {
    color: M3Colors.onPrimary,
  },
  memberChipText: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  memberChipTextSelected: {
    color: M3Colors.primary,
    fontWeight: '700',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: M3Colors.outlineVariant,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantName: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
  },
  participantRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customSplitInput: {
    width: 60,
    height: 34,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    borderRadius: M3Shapes.input,
    textAlign: 'center',
    backgroundColor: M3Colors.surface,
    color: M3Colors.onSurface,
  },
  shareText: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'right',
  },
  saveBtn: {
    borderRadius: M3Shapes.pill,
    marginTop: 8,
  },
  auditSection: {
    marginTop: 16,
    gap: 10,
  },
  auditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auditSectionTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  emptyAuditCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: 16,
    alignItems: 'center',
  },
  emptyAuditText: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
  },
  auditCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.card,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  auditTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  auditAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  auditAdminText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  auditDateText: {
    ...M3Typography.labelSmall,
    color: M3Colors.outline,
  },
  auditReasonText: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurface,
    fontStyle: 'italic',
  },
  auditComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surface,
    padding: 8,
    borderRadius: M3Shapes.input,
  },
  auditCol: {
    flex: 1,
  },
  auditColLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: M3Colors.outline,
    letterSpacing: 0.5,
  },
  auditColValue: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  auditColAmount: {
    ...M3Typography.labelMedium,
    fontWeight: '700',
    marginTop: 1,
  },
  suggestionsContainer: {
    marginTop: -2,
    marginBottom: 4,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  suggestionsTitle: {
    ...M3Typography.labelSmall,
    color: M3Colors.primary,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: M3Colors.primaryContainer,
    borderColor: 'rgba(0, 33, 20, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  suggestionEmoji: {
    fontSize: 13,
  },
  suggestionText: {
    ...M3Typography.labelMedium,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '600',
    fontSize: 11.5,
  },
});
