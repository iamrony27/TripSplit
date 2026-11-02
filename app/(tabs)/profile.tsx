import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { TextInput, Button, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { isValidUpiId } from '../../src/services/upi/upiParser';
import { generateUpiPaymentUri } from '../../src/services/upi/upiLauncher';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, updateUpi, completeSetup } = useAuth();

  const [upiDialogVisible, setUpiDialogVisible] = useState(false);
  const [newUpiId, setNewUpiId] = useState(user?.upiId || '');
  const [upiError, setUpiError] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri && user) {
        await completeSetup({
          fullName: user.fullName,
          photoUrl: result.assets[0].uri,
          country: user.country,
          defaultCurrency: user.defaultCurrency,
          preferredLanguage: user.preferredLanguage,
          upiId: user.upiId,
        });
      }
    } catch (err) {
      console.warn('Avatar pick error:', err);
    }
  };

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

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Account Profile"
        subtitle="TripSplit"
        avatarUrl={user?.photoUrl}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(user?.fullName || 'M').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

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
                <Text style={styles.qrHint}>Scan to pay with any UPI app</Text>
              </View>

              <View style={styles.upiActionsRow}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setNewUpiId(user.upiId || '');
                    setUpiDialogVisible(true);
                  }}
                  icon="pencil"
                  textColor={M3Colors.primary}
                  style={styles.upiActionBtn}
                >
                  Edit UPI ID
                </Button>

                <Button
                  mode="contained"
                  onPress={() => router.push({ pathname: '/scan-qr', params: { returnTarget: 'profile' } })}
                  icon="qrcode-scan"
                  buttonColor={M3Colors.primary}
                  style={styles.upiActionBtn}
                >
                  Scan QR
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
                  onPress={() => setUpiDialogVisible(true)}
                  icon="plus"
                  buttonColor={M3Colors.primary}
                  style={styles.upiActionBtn}
                >
                  Enter UPI ID
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => router.push({ pathname: '/scan-qr', params: { returnTarget: 'profile' } })}
                  icon="qrcode-scan"
                  textColor={M3Colors.primary}
                  style={styles.upiActionBtn}
                >
                  Scan QR
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
          <Dialog.Title style={styles.dialogTitle}>Update UPI ID</Dialog.Title>
          <Dialog.Content>
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
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setUpiDialogVisible(false)} textColor={M3Colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Button
              onPress={handleSaveUpi}
              loading={savingUpi}
              disabled={savingUpi}
              textColor={M3Colors.primary}
            >
              Save
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
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
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
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: M3Colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: M3Colors.surfaceContainerLowest,
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
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 8,
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
});
