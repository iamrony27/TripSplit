import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useTrips } from '../../context/TripContext';
import { GroupInvitation } from '../../types/invitation';
import { revokeInvitation, getOrCreateTripInvitation } from '../../services/firebase/invitationService';
import { useAuth } from '../../context/AuthContext';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

interface GroupInviteModalProps {
  visible: boolean;
  onClose?: () => void;
  onDismiss?: () => void;
  tripId: string;
  tripTitle: string;
}

export const GroupInviteModal: React.FC<GroupInviteModalProps> = ({
  visible,
  onClose,
  onDismiss,
  tripId,
  tripTitle,
}) => {
  const handleClose = onClose || onDismiss || (() => {});
  const { user } = useAuth();
  const { isTripAdmin } = useTrips();

  const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible && tripId) {
      loadInvitation();
    }
  }, [visible, tripId]);

  const loadInvitation = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const inv = await getOrCreateTripInvitation(tripId, tripTitle, user.id, user.fullName || 'Admin');
      setInvitation(inv);
    } catch (err: any) {
      console.warn('Failed to load invitation:', err);
      Alert.alert('Error', 'Failed to load group invitation code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!invitation) return;
    await Clipboard.setStringAsync(invitation.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!invitation) return;
    try {
      await Share.share({
        message: `Join our group "${tripTitle}" on TripSplit!\nUse Invitation Code: ${invitation.code}\nOr scan our group QR code in TripSplit.`,
        title: `Join ${tripTitle} on TripSplit`,
      });
    } catch (err: any) {
      console.warn('Share error:', err);
    }
  };

  const handleRegenerate = async () => {
    if (!invitation || !user) return;
    Alert.alert(
      'Regenerate Code',
      'The current code will be revoked. Anyone with the old code will no longer be able to submit join requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate New Code',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await revokeInvitation(invitation.id, tripId);
              const newInv = await getOrCreateTripInvitation(
                tripId,
                tripTitle,
                user.id,
                user.fullName || 'Admin'
              );
              setInvitation(newInv);
              Alert.alert('New Code Generated', `Your new code is: ${newInv.code}`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to regenerate code.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const inviteUri = invitation ? `tripsplit://join?code=${invitation.code}` : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerIconCircle}>
              <MaterialCommunityIcons name="qrcode-scan" size={24} color={M3Colors.primary} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.modalTitle}>Group Invitation</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {tripTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color={M3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={M3Colors.primary} />
              <Text style={styles.loadingText}>Generating secure invitation...</Text>
            </View>
          ) : invitation ? (
            <>
              {/* QR Code Canvas */}
              <View style={styles.qrWrapper}>
                <QRCode
                  value={inviteUri}
                  size={180}
                  color={M3Colors.onSurface}
                  backgroundColor="#FFFFFF"
                />
              </View>

              <Text style={styles.scanInstruction}>
                Ask new or existing members to scan this QR code with the TripSplit camera.
              </Text>

              {/* Code display pill */}
              <View style={styles.codePill}>
                <View>
                  <Text style={styles.codeLabel}>INVITATION CODE</Text>
                  <Text style={styles.codeValue}>{invitation.code}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCopyCode}
                  style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
                >
                  <MaterialCommunityIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={18}
                    color={copied ? '#FFFFFF' : M3Colors.primary}
                  />
                  <Text style={[styles.copyBtnText, copied && { color: '#FFFFFF' }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <Button
                  mode="contained"
                  onPress={handleShare}
                  icon="share-variant"
                  buttonColor={M3Colors.primary}
                  textColor={M3Colors.onPrimary}
                  style={styles.shareBtn}
                >
                  Share Invite
                </Button>

                {isTripAdmin && (
                  <Button
                    mode="outlined"
                    onPress={handleRegenerate}
                    textColor={M3Colors.error}
                    style={styles.revokeBtn}
                  >
                    Regenerate
                  </Button>
                )}
              </View>

              <Text style={styles.approvalNotice}>
                Scanning submits a join request. Group access is granted only after administrator approval.
              </Text>
            </>
          ) : (
            <Text style={styles.errorNotice}>No active invitation code found.</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
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
  },
  closeBtn: {
    padding: 4,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
  },
  qrWrapper: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: M3Colors.surfaceContainerHigh,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 12,
  },
  scanInstruction: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardMedium,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: M3Colors.surfaceContainerHigh,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: '900',
    color: M3Colors.primary,
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    gap: 4,
  },
  copyBtnSuccess: {
    backgroundColor: M3Colors.primary,
  },
  copyBtnText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: 10,
  },
  shareBtn: {
    flex: 2,
    borderRadius: M3Shapes.pill,
  },
  revokeBtn: {
    flex: 1,
    borderRadius: M3Shapes.pill,
    borderColor: M3Colors.error,
  },
  approvalNotice: {
    ...M3Typography.bodySm,
    color: M3Colors.outline,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  errorNotice: {
    ...M3Typography.bodySm,
    color: M3Colors.error,
    paddingVertical: 20,
  },
});
