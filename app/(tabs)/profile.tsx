import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { TextInput, Button, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { isValidUpiId } from '../../src/services/upi/upiParser';
import { generateUpiPaymentUri, launchUpiPayment } from '../../src/services/upi/upiLauncher';

const DEVELOPER_UPI = 'rony@okhdfcbank';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, updateUpi } = useAuth();
  const { showToast } = useToast();

  const [upiDialogVisible, setUpiDialogVisible] = useState(false);
  const [newUpiId, setNewUpiId] = useState(user?.upiId || '');
  const [upiError, setUpiError] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);

  // Developer Support State
  const [supportQrModalVisible, setSupportQrModalVisible] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(100);

  const handleSaveUpi = async () => {
    if (!newUpiId.trim()) {
      setUpiError('Please enter a UPI ID.');
      return;
    }
    if (!isValidUpiId(newUpiId.trim())) {
      setUpiError('Invalid UPI ID format (e.g. name@okaxis).');
      return;
    }

    setSavingUpi(true);
    setUpiError('');
    try {
      await updateUpi(newUpiId.trim());
      setUpiDialogVisible(false);
    } catch (err: any) {
      setUpiError(err.message || 'Failed to update UPI ID');
    } finally {
      setSavingUpi(false);
    }
  };

  const handleRemoveUpi = () => {
    Alert.alert(
      'Remove UPI ID',
      'Are you sure you want to remove your UPI ID? Other members in your trips will not be able to send payments to you via UPI.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateUpi('');
              Alert.alert('Removed', 'Your UPI ID has been removed.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove UPI ID');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your TripSplit account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to sign out.');
            }
          },
        },
      ]
    );
  };

  const personalUpiUri = user?.upiId
    ? generateUpiPaymentUri({
        upiId: user.upiId,
        payeeName: user.fullName || 'Member',
        amount: 0,
        currency: 'INR',
        note: 'TripSplit Payment',
      })
    : '';

  const handleCopyDeveloperUpi = async () => {
    await Clipboard.setStringAsync(DEVELOPER_UPI);
    showToast({
      type: 'success',
      title: 'UPI ID Copied',
      message: `${DEVELOPER_UPI} copied to clipboard!`,
    });
  };

  const handlePayDeveloperTip = async (amt: number) => {
    await launchUpiPayment({
      upiId: DEVELOPER_UPI,
      payeeName: 'Rony (TripSplit Developer)',
      amount: amt,
      note: 'Supporting TripSplit Developer',
    });
  };

  const handleOpenGitHub = () => {
    Linking.openURL('https://github.com/iamrony27/TripSplit').catch(() => {
      Alert.alert('Notice', 'Could not open GitHub link in browser.');
    });
  };

  const developerUpiUri = generateUpiPaymentUri({
    upiId: DEVELOPER_UPI,
    payeeName: 'Rony (TripSplit Developer)',
    amount: tipAmount,
    currency: 'INR',
    note: 'TripSplit Support',
  });

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Account Profile"
        subtitle="TripSplit"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {(user?.fullName || 'M').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.profileName}>{user?.fullName || 'Member'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>

          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <MaterialCommunityIcons name="earth" size={14} color={M3Colors.primary} />
              <Text style={styles.tagText}>{user?.country || 'India'}</Text>
            </View>
            <View style={styles.tag}>
              <MaterialCommunityIcons name="cash" size={14} color={M3Colors.secondary} />
              <Text style={styles.tagText}>{user?.defaultCurrency || 'INR'}</Text>
            </View>
          </View>
        </View>

        {/* UPI ID & QR Code Card strictly matching Stitch Screen 5 */}
        <View style={styles.upiCard}>
          <View style={styles.upiHeader}>
            <View style={styles.upiIconTitle}>
              <View style={styles.upiIconBadge}>
                <MaterialCommunityIcons name="qrcode" size={20} color={M3Colors.onPrimary} />
              </View>
              <View>
                <Text style={styles.upiTitle}>UPI Settlement ID</Text>
                <Text style={styles.upiSubtitle}>For receiving payments from group members</Text>
              </View>
            </View>
          </View>

          {user?.upiId ? (
            <View style={styles.upiContent}>
              <View style={styles.upiPill}>
                <MaterialCommunityIcons name="bank-outline" size={16} color={M3Colors.primary} />
                <Text style={styles.upiPillText}>{user.upiId}</Text>
              </View>

              {/* QR Code Container */}
              <View style={styles.qrContainer}>
                <QRCode
                  value={personalUpiUri}
                  size={160}
                  color={M3Colors.onSurface}
                  backgroundColor="#FFFFFF"
                />
                <Text style={styles.qrHint}>Your Receiving QR Code</Text>
                <Text style={styles.qrSubHint}>Other trip members can scan this with Google Pay or PhonePe to pay you</Text>
              </View>

              <View style={styles.upiActionsRow}>
                <Button
                  mode="contained"
                  onPress={() => {
                    setNewUpiId(user.upiId || '');
                    setUpiDialogVisible(true);
                  }}
                  icon="pencil"
                  buttonColor={M3Colors.primary}
                  textColor={M3Colors.onPrimary}
                  style={styles.upiActionBtn}
                >
                  Edit UPI ID
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleRemoveUpi}
                  icon="trash-can-outline"
                  textColor={M3Colors.error}
                  style={[styles.upiActionBtn, { borderColor: M3Colors.error }]}
                >
                  Remove UPI
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.noUpiContainer}>
              <MaterialCommunityIcons name="qrcode-remove" size={48} color={M3Colors.onSurfaceVariant} />
              <Text style={styles.noUpiTitle}>No UPI ID linked</Text>
              <Text style={styles.noUpiSubtitle}>
                Add your UPI ID so group members can pay you directly with Google Pay, PhonePe, or Paytm.
              </Text>
              <View style={styles.upiActionsRow}>
                <Button
                  mode="contained"
                  onPress={() => {
                    setNewUpiId('');
                    setUpiDialogVisible(true);
                  }}
                  icon="plus"
                  buttonColor={M3Colors.primary}
                  textColor={M3Colors.onPrimary}
                  style={styles.upiActionBtn}
                >
                  Add / Link UPI ID
                </Button>
              </View>
            </View>
          )}
        </View>

        {/* Sync & Settings Card */}
        <View style={styles.settingsCard}>
          <Text style={styles.settingsHeader}>System & Synchronization</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="cloud-check" size={22} color={M3Colors.primary} />
              <View>
                <Text style={styles.settingTitle}>Firebase Cloud Sync</Text>
                <Text style={styles.settingDesc}>Automatic offline-first synchronization</Text>
              </View>
            </View>
            <View style={styles.statusLivePill}>
              <Text style={styles.statusLiveText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="shield-check" size={22} color={M3Colors.secondary} />
              <View>
                <Text style={styles.settingTitle}>Security & Privacy</Text>
                <Text style={styles.settingDesc}>Member-scoped Firestore rules enforced</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="check" size={20} color={M3Colors.primary} />
          </View>
        </View>

        {/* Support the Developer Card */}
        <View style={styles.supportCard}>
          <View style={styles.supportHeader}>
            <View style={styles.heartIconCircle}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#EF4444" />
            </View>
            <View style={styles.supportHeaderTextWrap}>
              <Text style={styles.supportTitle}>Support the Developer ☕</Text>
              <Text style={styles.supportSubtitle}>Handcrafted with love by Rony</Text>
            </View>
          </View>

          <Text style={styles.supportMessage}>
            "Hi there! I'm Rony, an independent developer pouring hundreds of late nights and endless dedication into building TripSplit completely free, without annoying ads or paywalls. Every feature is hand-crafted to make travel with your loved ones simple and memorable. If TripSplit has helped you split expenses and keep friendships stress-free, a small coffee or tip goes a very long way in keeping this project alive and growing. Your warmth and generosity mean everything to me! ❤️"
          </Text>

          <View style={styles.devUpiPill}>
            <MaterialCommunityIcons name="bank-transfer" size={16} color={M3Colors.primary} />
            <Text style={styles.devUpiText}>UPI: {DEVELOPER_UPI}</Text>
            <TouchableOpacity onPress={handleCopyDeveloperUpi} style={styles.copyPillBtn}>
              <MaterialCommunityIcons name="content-copy" size={13} color={M3Colors.primary} />
              <Text style={styles.copyPillBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>

          {/* Tip Amount Selection */}
          <Text style={styles.tipSelectorLabel}>Select a tip amount:</Text>
          <View style={styles.tipAmountRow}>
            {[50, 100, 200, 500].map((amt) => {
              const isSelected = tipAmount === amt;
              return (
                <TouchableOpacity
                  key={amt}
                  onPress={() => setTipAmount(amt)}
                  style={[styles.tipChip, isSelected && styles.tipChipSelected]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tipChipText, isSelected && styles.tipChipTextSelected]}>
                    ₹{amt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.supportActionsRow}>
            <Button
              mode="contained"
              icon="send"
              onPress={() => handlePayDeveloperTip(tipAmount)}
              buttonColor={M3Colors.primary}
              textColor={M3Colors.onPrimary}
              style={styles.payTipBtn}
            >
              Tip ₹{tipAmount} via UPI
            </Button>
            <Button
              mode="outlined"
              icon="qrcode"
              onPress={() => setSupportQrModalVisible(true)}
              textColor={M3Colors.primary}
              style={styles.qrTipBtn}
            >
              Scan QR
            </Button>
          </View>
        </View>

        {/* GitHub & Open Source Card */}
        <View style={styles.githubCard}>
          <View style={styles.githubLeft}>
            <View style={styles.githubIconWrap}>
              <MaterialCommunityIcons name="github" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.githubTextWrap}>
              <Text style={styles.githubTitle}>Find on GitHub</Text>
              <Text style={styles.githubDesc}>Star, contribute, or view open-source code</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleOpenGitHub} style={styles.githubBtn} activeOpacity={0.8}>
            <Text style={styles.githubBtnText}>View Repo</Text>
            <MaterialCommunityIcons name="open-in-new" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={20} color={M3Colors.error} />
          <Text style={styles.logoutText}>Log Out of TripSplit</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>TripSplit v1.0.0 • Material 3 Design System</Text>
      </ScrollView>

      {/* Edit UPI Dialog */}
      <Portal>
        <Dialog
          visible={upiDialogVisible}
          onDismiss={() => setUpiDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {user?.upiId ? 'Update UPI ID' : 'Link UPI ID'}
          </Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {upiError ? (
              <Text style={styles.dialogError}>{upiError}</Text>
            ) : null}
            <TextInput
              label="UPI ID"
              placeholder="e.g. name@okhdfcbank"
              value={newUpiId}
              onChangeText={(t) => {
                setNewUpiId(t);
                if (upiError) setUpiError('');
              }}
              mode="outlined"
              outlineColor={M3Colors.outlineVariant}
              activeOutlineColor={M3Colors.primary}
              left={<TextInput.Icon icon="bank-outline" />}
            />

            {/* OR Divider */}
            <View style={styles.dialogDividerRow}>
              <View style={styles.dialogDividerLine} />
              <Text style={styles.dialogDividerText}>OR AUTO-FILL VIA QR</Text>
              <View style={styles.dialogDividerLine} />
            </View>

            {/* Scan Your Own UPI QR Code Option */}
            <TouchableOpacity
              style={styles.dialogScanCard}
              onPress={() => {
                setUpiDialogVisible(false);
                router.push({ pathname: '/scan-qr', params: { returnTarget: 'profile' } });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dialogScanIcon}>
                <MaterialCommunityIcons name="qrcode-scan" size={22} color={M3Colors.primary} />
              </View>
              <View style={styles.dialogScanTextWrap}>
                <Text style={styles.dialogScanTitle}>Scan Your UPI QR Code</Text>
                <Text style={styles.dialogScanSubtitle}>
                  Scan the QR code from your personal Google Pay, PhonePe, or Paytm app to automatically detect and set your UPI ID.
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={M3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setUpiDialogVisible(false)} textColor={M3Colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Button
              onPress={handleSaveUpi}
              loading={savingUpi}
              disabled={savingUpi}
              mode="contained"
              buttonColor={M3Colors.primary}
              textColor={M3Colors.onPrimary}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Developer Support QR Dialog */}
        <Dialog
          visible={supportQrModalVisible}
          onDismiss={() => setSupportQrModalVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            Support Developer ☕
          </Dialog.Title>
          <Dialog.Content style={{ alignItems: 'center', paddingVertical: 10 }}>
            <View style={styles.devQrBox}>
              <QRCode
                value={developerUpiUri}
                size={180}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            </View>
            <Text style={styles.devQrUpiText}>{DEVELOPER_UPI}</Text>
            <Text style={styles.devQrSubtext}>
              Scan using Google Pay, PhonePe, Paytm, or BHIM to send ₹{tipAmount}. Thank you for your kindness and support! ❤️
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCopyDeveloperUpi} textColor={M3Colors.primary}>
              Copy UPI ID
            </Button>
            <Button onPress={() => setSupportQrModalVisible(false)} textColor={M3Colors.onSurfaceVariant}>
              Close
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
    paddingBottom: 96,
    gap: 12,
  },
  profileCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...M3Typography.displaySm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
  },
  profileName: {
    ...M3Typography.headlineSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  profileEmail: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: M3Colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: M3Shapes.pill,
  },
  tagText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  upiCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  upiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  upiIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upiIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  upiSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
  },
  upiContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  upiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: M3Shapes.pill,
    marginBottom: 16,
  },
  upiPillText: {
    ...M3Typography.labelLg,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: M3Shapes.cardLarge,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    marginBottom: 16,
  },
  qrHint: {
    ...M3Typography.labelLarge,
    color: M3Colors.onSurface,
    fontWeight: '700',
    marginTop: 8,
  },
  qrSubHint: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: 2,
    fontSize: 11,
  },
  upiActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  upiActionBtn: {
    flex: 1,
    borderRadius: M3Shapes.pill,
  },
  noUpiContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  noUpiTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  noUpiSubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  settingsCard: {
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
  settingsHeader: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
    fontWeight: '600',
  },
  settingDesc: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
  },
  statusLivePill: {
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  statusLiveText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
    fontSize: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: M3Colors.errorContainer,
    paddingVertical: 14,
    borderRadius: M3Shapes.pill,
    marginTop: 8,
  },
  logoutText: {
    ...M3Typography.labelLg,
    color: M3Colors.onErrorContainer,
    fontWeight: '700',
  },
  versionText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 11,
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
  dialogContent: {
    gap: 12,
  },
  dialogDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dialogDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: M3Colors.outlineVariant,
  },
  dialogDividerText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  dialogScanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.cardMedium,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: M3Colors.primaryContainer,
  },
  dialogScanIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogScanTextWrap: {
    flex: 1,
  },
  dialogScanTitle: {
    ...M3Typography.labelLarge,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  dialogScanSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  supportCard: {
    backgroundColor: '#FFF7ED', // Warm peach tint
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 3,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    gap: 12,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heartIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportHeaderTextWrap: {
    flex: 1,
  },
  supportTitle: {
    ...M3Typography.titleMedium,
    color: '#9A3412',
    fontWeight: '800',
  },
  supportSubtitle: {
    ...M3Typography.bodySmall,
    color: '#C2410C',
    fontSize: 12,
  },
  supportMessage: {
    ...M3Typography.bodyMedium,
    color: '#431407',
    lineHeight: 21,
    fontSize: 13,
    fontStyle: 'italic',
  },
  devUpiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  devUpiText: {
    ...M3Typography.labelMedium,
    color: '#7C2D12',
    fontWeight: '700',
    flex: 1,
  },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  copyPillBtnText: {
    ...M3Typography.labelSmall,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  tipSelectorLabel: {
    ...M3Typography.labelMedium,
    color: '#9A3412',
    fontWeight: '700',
    marginTop: 2,
  },
  tipAmountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  tipChipSelected: {
    backgroundColor: '#EA580C',
    borderColor: '#C2410C',
  },
  tipChipText: {
    ...M3Typography.labelMedium,
    color: '#9A3412',
    fontWeight: '700',
  },
  tipChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  supportActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  payTipBtn: {
    flex: 1.6,
    borderRadius: M3Shapes.pill,
  },
  qrTipBtn: {
    flex: 1,
    borderRadius: M3Shapes.pill,
    borderColor: M3Colors.primary,
  },
  githubCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.md,
    elevation: 2,
    gap: 12,
  },
  githubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  githubIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  githubTextWrap: {
    flex: 1,
  },
  githubTitle: {
    ...M3Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  githubDesc: {
    ...M3Typography.bodySmall,
    color: '#94A3B8',
    fontSize: 11,
  },
  githubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  githubBtnText: {
    ...M3Typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  devQrBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    marginBottom: 10,
    elevation: 3,
  },
  devQrUpiText: {
    ...M3Typography.labelLarge,
    color: M3Colors.onSurface,
    fontWeight: '800',
    marginTop: 4,
  },
  devQrSubtext: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
});
