import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { TextInput, Button, Checkbox, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTrips } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { CategoryPicker } from '../../src/components/expense/CategoryPicker';
import { SegmentedPills } from '../../src/components/common/SegmentedPills';
import { SplitMode, ParticipantSplit } from '../../src/types/expense';
import { SUPPORTED_CURRENCIES, formatCurrency } from '../../src/services/currency/exchangeRateService';
import { calculateExpenseShares, round2 } from '../../src/engine/expenseCalculator';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeTrip, addExpense } = useTrips();

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <TopAppBar title="Add Expense" showBack onBackPress={() => router.back()} />
        <View style={styles.noTripCenter}>
          <Text style={styles.noTripText}>Please select or create an active trip first.</Text>
          <Button mode="contained" onPress={() => router.replace('/(tabs)/trips')}>
            View Trips
          </Button>
        </View>
      </View>
    );
  }

  const baseCurrency = activeTrip.baseCurrency || 'INR';

  // State
  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [paidByMemberId, setPaidByMemberId] = useState<string>(
    activeTrip.members.find((m) => m.userId === user?.id)?.id || activeTrip.members[0]?.id || ''
  );
  const [splitMode, setSplitMode] = useState<SplitMode>('EQUALLY');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    activeTrip.members.map((m) => m.id)
  );
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const numAmount = parseFloat(amountStr) || 0;

  // Split mode options for pills
  const splitOptions = [
    { value: 'EQUALLY' as SplitMode, label: 'Equally' },
    { value: 'UNEQUALLY' as SplitMode, label: 'Exact' },
    { value: 'PERCENTAGE' as SplitMode, label: 'Percent' },
    { value: 'BY_SHARES' as SplitMode, label: 'Shares' },
  ];

  // Toggle member inclusion
  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length <= 1) {
          Alert.alert('Cannot Deselect', 'At least one participant must be selected.');
          return prev;
        }
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  // Convert custom splits to ParticipantSplit array
  const splitsDataList: ParticipantSplit[] = useMemo(() => {
    return activeTrip.members.map((m) => {
      const isSelected = selectedMemberIds.includes(m.id);
      const customVal = customSplits[m.id];
      return {
        memberId: m.id,
        selected: isSelected,
        amount: 0,
        customAmount: splitMode === 'UNEQUALLY' ? customVal : undefined,
        percentage: splitMode === 'PERCENTAGE' ? customVal : undefined,
        shares: splitMode === 'BY_SHARES' ? customVal : undefined,
      };
    });
  }, [activeTrip.members, selectedMemberIds, customSplits, splitMode]);

  // Compute live shares using Engine
  const liveShares = useMemo(() => {
    if (numAmount <= 0 || selectedMemberIds.length === 0) return {};
    return calculateExpenseShares(numAmount, splitMode, selectedMemberIds, splitsDataList);
  }, [numAmount, splitMode, selectedMemberIds, splitsDataList]);

  const handlePickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setReceiptUrl(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Receipt image error:', err);
    }
  };

  const handleSave = async () => {
    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid expense amount.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter an expense title.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setErrorMsg('Please select at least one participant.');
      return;
    }

    // Validation for UNEQUALLY sum
    if (splitMode === 'UNEQUALLY') {
      const sum = selectedMemberIds.reduce((s, id) => s + (customSplits[id] || 0), 0);
      if (Math.abs(sum - numAmount) > 0.05) {
        setErrorMsg(`Exact amounts sum to ${sum.toFixed(2)}, but total expense is ${numAmount.toFixed(2)}.`);
        return;
      }
    }

    // Validation for PERCENTAGE sum
    if (splitMode === 'PERCENTAGE') {
      const sum = selectedMemberIds.reduce((s, id) => s + (customSplits[id] || 0), 0);
      if (Math.abs(sum - 100) > 0.5) {
        setErrorMsg(`Percentages sum to ${sum}%, but must equal 100%.`);
        return;
      }
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await addExpense({
        tripId: activeTrip.id,
        title: title.trim(),
        amount: numAmount,
        originalCurrency: currency,
        paidByMemberId,
        selectedParticipantIds: selectedMemberIds,
        splitMode,
        splitsData: splitsDataList,
        categoryId,
        expenseDate,
        description: description.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
      });

      router.back();
    } catch (err: any) {
      console.warn('Save expense error:', err);
      setErrorMsg(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Add Expense"
        subtitle={activeTrip.title}
        showBack
        onBackPress={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={M3Colors.onErrorContainer} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Hero Amount Input Card matching Stitch Screen 2 */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>ENTER AMOUNT</Text>
            <View style={styles.amountInputRow}>
              {/* Currency Pill */}
              <Menu
                visible={currencyMenuVisible}
                onDismiss={() => setCurrencyMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setCurrencyMenuVisible(true)}
                    style={styles.currencyPill}
                  >
                    <Text style={styles.currencyPillText}>
                      {SUPPORTED_CURRENCIES[currency]?.symbol || currency}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={M3Colors.onPrimaryContainer} />
                  </TouchableOpacity>
                }
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <Menu.Item
                    key={c.code}
                    onPress={() => {
                      setCurrency(c.code);
                      setCurrencyMenuVisible(false);
                    }}
                    title={`${c.flag} ${c.code} (${c.symbol})`}
                  />
                ))}
              </Menu>

              <TextInput
                value={amountStr}
                onChangeText={(t) => {
                  setAmountStr(t);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="0.00"
                placeholderTextColor="rgba(0, 33, 20, 0.45)"
                keyboardType="decimal-pad"
                textColor={M3Colors.onPrimaryContainer}
                style={styles.amountInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
              />
            </View>
          </View>

        {/* Expense Info Card */}
        <View style={styles.card}>
          <TextInput
            label="What was this for? *"
            placeholder="e.g. Dinner, Fuel, Flight Tickets"
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (errorMsg) setErrorMsg('');
            }}
            mode="outlined"
            style={styles.input}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            left={<TextInput.Icon icon="tag-outline" />}
          />

          {/* Category Picker */}
          <CategoryPicker
            selectedCategoryId={categoryId}
            onSelectCategory={setCategoryId}
          />

          {/* Paid By Selection */}
          <Text style={styles.fieldLabel}>Paid By</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.payerList}>
            {activeTrip.members.map((m) => {
              const isSelected = m.id === paidByMemberId;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setPaidByMemberId(m.id)}
                  style={[styles.payerChip, isSelected && styles.payerChipActive]}
                >
                  <MaterialCommunityIcons
                    name={isSelected ? 'check-circle' : 'account-outline'}
                    size={16}
                    color={isSelected ? M3Colors.onPrimary : M3Colors.onSurfaceVariant}
                  />
                  <Text style={[styles.payerChipText, isSelected && styles.payerChipTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Split Mode & Member Allocation Card */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Split Method</Text>
          <SegmentedPills
            options={splitOptions}
            selectedValue={splitMode}
            onSelect={setSplitMode}
          />

          <View style={styles.membersSplitHeader}>
            <Text style={styles.membersSplitTitle}>
              Split with ({selectedMemberIds.length} of {activeTrip.members.length})
            </Text>
            {splitMode === 'EQUALLY' && numAmount > 0 && (
              <Text style={styles.perPersonShare}>
                ~{formatCurrency(numAmount / Math.max(1, selectedMemberIds.length), currency)} / person
              </Text>
            )}
          </View>

          {/* Members Checkbox List */}
          {activeTrip.members.map((member) => {
            const isSelected = selectedMemberIds.includes(member.id);
            const computedShare = liveShares[member.id] || 0;

            return (
              <View key={member.id} style={styles.memberSplitRow}>
                <TouchableOpacity
                  onPress={() => toggleMember(member.id)}
                  style={styles.memberCheckRow}
                  activeOpacity={0.7}
                >
                  <Checkbox
                    status={isSelected ? 'checked' : 'unchecked'}
                    onPress={() => toggleMember(member.id)}
                    color={M3Colors.primary}
                  />
                  <Text style={[styles.memberSplitName, !isSelected && styles.memberSplitNameDeselected]}>
                    {member.name}
                  </Text>
                </TouchableOpacity>

                {isSelected && (
                  <View style={styles.shareInputContainer}>
                    {splitMode === 'EQUALLY' && (
                      <Text style={styles.computedShareText}>
                        {formatCurrency(computedShare, currency)}
                      </Text>
                    )}

                    {splitMode === 'UNEQUALLY' && (
                      <TextInput
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        value={customSplits[member.id]?.toString() || ''}
                        onChangeText={(t) =>
                          setCustomSplits((prev) => ({ ...prev, [member.id]: parseFloat(t) || 0 }))
                        }
                        mode="outlined"
                        dense
                        style={styles.customSplitInput}
                        outlineColor={M3Colors.outlineVariant}
                        activeOutlineColor={M3Colors.primary}
                      />
                    )}

                    {splitMode === 'PERCENTAGE' && (
                      <View style={styles.unitInputRow}>
                        <TextInput
                          placeholder="%"
                          keyboardType="numeric"
                          value={customSplits[member.id]?.toString() || ''}
                          onChangeText={(t) =>
                            setCustomSplits((prev) => ({ ...prev, [member.id]: parseFloat(t) || 0 }))
                          }
                          mode="outlined"
                          dense
                          style={styles.customSplitInputSmall}
                          outlineColor={M3Colors.outlineVariant}
                          activeOutlineColor={M3Colors.primary}
                        />
                        <Text style={styles.unitSuffix}>%</Text>
                      </View>
                    )}

                    {splitMode === 'BY_SHARES' && (
                      <View style={styles.unitInputRow}>
                        <TextInput
                          placeholder="1"
                          keyboardType="numeric"
                          value={customSplits[member.id]?.toString() || '1'}
                          onChangeText={(t) =>
                            setCustomSplits((prev) => ({ ...prev, [member.id]: parseInt(t) || 1 }))
                          }
                          mode="outlined"
                          dense
                          style={styles.customSplitInputSmall}
                          outlineColor={M3Colors.outlineVariant}
                          activeOutlineColor={M3Colors.primary}
                        />
                        <Text style={styles.unitSuffix}>shares</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Date & Optional Metadata Card */}
        <View style={styles.card}>
          <TextInput
            label="Expense Date (YYYY-MM-DD)"
            value={expenseDate}
            onChangeText={setExpenseDate}
            mode="outlined"
            style={styles.input}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            left={<TextInput.Icon icon="calendar" />}
          />

          <TextInput
            label="Notes / Description (optional)"
            placeholder="e.g. Britto's table #14"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.input}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            left={<TextInput.Icon icon="text-short" />}
          />

          {/* Receipt Photo Attachment */}
          <TouchableOpacity onPress={handlePickReceipt} style={styles.receiptPickerBtn}>
            <MaterialCommunityIcons name="camera" size={20} color={M3Colors.primary} />
            <Text style={styles.receiptPickerText}>
              {receiptUrl ? 'Receipt Attached (Tap to change)' : 'Attach Receipt Image (optional)'}
            </Text>
          </TouchableOpacity>

          {receiptUrl ? (
            <Image source={{ uri: receiptUrl }} style={styles.receiptPreview} />
          ) : null}
        </View>

        {/* Save Expense Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          buttonColor={M3Colors.primary}
          style={styles.saveBtn}
          contentStyle={styles.saveBtnContent}
        >
          Save Expense
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: M3Colors.surface,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: M3Shapes.spacing.md,
    gap: 12,
    paddingBottom: 120,
  },
  noTripCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  noTripText: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.errorContainer,
    padding: 10,
    borderRadius: M3Shapes.cardSmall,
    gap: 8,
  },
  errorText: {
    ...M3Typography.bodySm,
    color: M3Colors.onErrorContainer,
    flex: 1,
  },
  amountCard: {
    backgroundColor: M3Colors.primaryContainer,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  amountLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
    letterSpacing: 1,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 10,
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
  },
  currencyPillText: {
    ...M3Typography.titleMedium,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
  },
  amountInput: {
    backgroundColor: 'transparent',
    fontSize: 36,
    fontWeight: '800',
    minWidth: 160,
    textAlign: 'center',
    color: M3Colors.onPrimaryContainer,
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
    gap: 10,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  fieldLabel: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
    marginTop: 4,
  },
  payerList: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  payerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: M3Colors.surfaceContainerHigh,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: M3Shapes.pill,
  },
  payerChipActive: {
    backgroundColor: M3Colors.primary,
  },
  payerChipText: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurface,
  },
  payerChipTextActive: {
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  membersSplitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  membersSplitTitle: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  perPersonShare: {
    ...M3Typography.labelSm,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  memberSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: M3Colors.outlineVariant,
  },
  memberCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberSplitName: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  memberSplitNameDeselected: {
    color: M3Colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  shareInputContainer: {
    alignItems: 'flex-end',
  },
  computedShareText: {
    ...M3Typography.labelLarge,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  customSplitInput: {
    width: 90,
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  unitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customSplitInputSmall: {
    width: 60,
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  unitSuffix: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
  },
  receiptPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    borderRadius: M3Shapes.cardSmall,
    backgroundColor: M3Colors.surfaceContainerLow,
  },
  receiptPickerText: {
    ...M3Typography.bodyMedium,
    color: M3Colors.primary,
    fontWeight: '600',
  },
  receiptPreview: {
    width: '100%',
    height: 180,
    borderRadius: M3Shapes.cardMedium,
    marginTop: 8,
  },
  saveBtn: {
    borderRadius: M3Shapes.pill,
    marginTop: 8,
  },
  saveBtnContent: {
    paddingVertical: 8,
  },
});
