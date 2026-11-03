import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TextInput, Button, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrips } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { TripMember } from '../../src/types/trip';
import { SUPPORTED_CURRENCIES } from '../../src/services/currency/exchangeRateService';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { isValidUpiId } from '../../src/services/upi/upiParser';
import { useKeyboardBottomInset } from '../../src/hooks/useKeyboardBottomInset';
import { safeGoBack } from '../../src/utils/navigation';
import { UpiScannerModal } from '../../src/components/common/UpiScannerModal';

export default function CreateTripScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createNewTrip } = useTrips();
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const keyboardInset = useKeyboardBottomInset(80);
  const [scannerVisible, setScannerVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseCurrency, setBaseCurrency] = useState(user?.defaultCurrency || 'INR');
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Initial Members (Organizer is always 1st)
  const [members, setMembers] = useState<Array<{ name: string; upiId: string }>>([
    { name: 'Alex', upiId: '' },
    { name: 'Priya', upiId: '' },
  ]);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUpi, setNewMemberUpi] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    if (newMemberUpi.trim() && !isValidUpiId(newMemberUpi.trim())) {
      Alert.alert('Invalid UPI', 'Please enter a valid UPI address or leave it blank.');
      return;
    }
    setMembers((prev) => [...prev, { name: newMemberName.trim(), upiId: newMemberUpi.trim() }]);
    setNewMemberName('');
    setNewMemberUpi('');
  };

  const handleRemoveMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a trip title.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const formattedMembers: TripMember[] = members.map((m, idx) => ({
        id: `member_${Date.now()}_${idx}`,
        name: m.name,
        upiId: m.upiId || undefined,
        totalPaid: 0,
        totalShare: 0,
        netBalance: 0,
      }));

      const newTrip = await createNewTrip(
        title.trim(),
        description.trim(),
        baseCurrency,
        formattedMembers,
        undefined,
        startDate
      );

      router.replace({ pathname: '/trip/[id]', params: { id: newTrip.id } });
    } catch (err: any) {
      console.warn('Create trip error:', err);
      setErrorMsg(err.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Create New Trip"
        subtitle="TripSplit"
        showBack
        fallbackRoute="/(tabs)/trips"
        onBackPress={() => safeGoBack(router, '/(tabs)/trips')}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(keyboardInset, 100) }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trip Details</Text>

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={M3Colors.onErrorContainer} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

          <TextInput
            label="Trip Title *"
            placeholder="e.g. Goa Vacation, Europe Tour"
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (errorMsg) setErrorMsg('');
            }}
            mode="outlined"
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            left={<TextInput.Icon icon="wallet-travel" />}
          />

          <TextInput
            label="Description (optional)"
            placeholder="e.g. Friends weekend getaway"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            left={<TextInput.Icon icon="text-short" />}
          />

          {/* Currency Menu */}
          <Menu
            visible={currencyMenuVisible}
            onDismiss={() => setCurrencyMenuVisible(false)}
            anchor={
              <TouchableOpacity
                onPress={() => setCurrencyMenuVisible(true)}
                style={styles.currencySelector}
              >
                <View style={styles.currencyLeft}>
                  <MaterialCommunityIcons name="cash" size={20} color={M3Colors.primary} />
                  <View>
                    <Text style={styles.currencyLabel}>Base Trip Currency</Text>
                    <Text style={styles.currencyValue}>
                      {SUPPORTED_CURRENCIES[baseCurrency]?.flag} {baseCurrency} - {SUPPORTED_CURRENCIES[baseCurrency]?.name}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color={M3Colors.onSurfaceVariant} />
              </TouchableOpacity>
            }
          >
            {Object.values(SUPPORTED_CURRENCIES).map((c) => (
              <Menu.Item
                key={c.code}
                onPress={() => {
                  setBaseCurrency(c.code);
                  setCurrencyMenuVisible(false);
                }}
                title={`${c.flag} ${c.code} - ${c.name} (${c.symbol})`}
              />
            ))}
          </Menu>

          <TextInput
            label="Start Date"
            value={startDate}
            onChangeText={setStartDate}
            mode="outlined"
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            left={<TextInput.Icon icon="calendar" />}
          />
        </View>

        {/* Trip Members Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Members</Text>
          <Text style={styles.cardSubtitle}>
            Add friends traveling on this trip. You can also add more members later.
          </Text>

          {/* Current user (organizer) */}
          <View style={styles.organizerRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.avatarLetter}>
                {(user?.fullName || 'Y').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{user?.fullName || 'You'} (Organizer)</Text>
              <Text style={styles.memberUpi}>{user?.upiId || 'No UPI ID'}</Text>
            </View>
            <View style={styles.organizerBadge}>
              <Text style={styles.organizerBadgeText}>HOST</Text>
            </View>
          </View>

          {/* Added members list */}
          {members.map((m, idx) => (
            <View key={idx} style={styles.memberRow}>
              <View style={[styles.memberAvatar, { backgroundColor: M3Colors.secondaryContainer }]}>
                <Text style={[styles.avatarLetter, { color: M3Colors.onSecondaryContainer }]}>
                  {m.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberUpi}>{m.upiId || 'No UPI ID'}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveMember(idx)} style={styles.removeBtn}>
                <MaterialCommunityIcons name="close" size={18} color={M3Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Inline Add Member Form */}
          <View style={styles.addMemberBox}>
            <Text style={styles.addMemberTitle}>Add Participant</Text>
            <TextInput
              label="Friend's Name"
              value={newMemberName}
              onChangeText={setNewMemberName}
              onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)}
              mode="outlined"
              style={styles.memberInput}
              outlineColor={M3Colors.outlineVariant}
              activeOutlineColor={M3Colors.primary}
            />
            <TextInput
              label="UPI ID (optional)"
              placeholder="e.g. friend@okhdfcbank"
              value={newMemberUpi}
              onChangeText={setNewMemberUpi}
              onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)}
              mode="outlined"
              style={styles.memberInput}
              outlineColor={M3Colors.outlineVariant}
              activeOutlineColor={M3Colors.primary}
              right={
                <TextInput.Icon
                  icon="qrcode-scan"
                  color={M3Colors.primary}
                  onPress={() => setScannerVisible(true)}
                />
              }
            />

            <TouchableOpacity
              style={styles.scanQuickBtn}
              onPress={() => setScannerVisible(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={18} color={M3Colors.primary} />
              <Text style={styles.scanQuickText}>Scan Friend's UPI QR Code</Text>
            </TouchableOpacity>

            <Button
              mode="outlined"
              onPress={handleAddMember}
              icon="account-plus"
              textColor={M3Colors.primary}
              style={styles.addMemberBtn}
            >
              Add to Group
            </Button>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          buttonColor={M3Colors.primary}
          style={styles.submitBtn}
          contentStyle={styles.submitBtnContent}
        >
          Create Trip & Start Splitting
        </Button>
      </ScrollView>

      {/* UPI QR Scanner Modal */}
      <UpiScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        friendName={newMemberName}
        onScanned={(scannedUpi, payeeName) => {
          setNewMemberUpi(scannedUpi);
          if (!newMemberName.trim() && payeeName) {
            setNewMemberName(payeeName);
          }
          setScannerVisible(false);
        }}
      />
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
    paddingBottom: 100,
  },
  card: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    gap: 12,
  },
  cardTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  cardSubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    marginTop: -4,
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
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: M3Shapes.cardSmall,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencyLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
  },
  currencyValue: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: M3Colors.outlineVariant,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    ...M3Typography.labelLg,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  memberUpi: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
  },
  organizerBadge: {
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  organizerBadgeText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 10,
  },
  removeBtn: {
    padding: 6,
  },
  addMemberBox: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardMedium,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  addMemberTitle: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  memberInput: {
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  addMemberBtn: {
    borderRadius: M3Shapes.pill,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  submitBtn: {
    borderRadius: M3Shapes.pill,
    marginTop: 8,
  },
  submitBtnContent: {
    paddingVertical: 8,
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
