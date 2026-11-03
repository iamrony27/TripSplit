import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseUpiQrCode, isValidUpiId } from '../../services/upi/upiParser';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

interface UpiScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (upiId: string, payeeName?: string) => void;
  title?: string;
  friendName?: string;
}

export const UpiScannerModal: React.FC<UpiScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  title,
  friendName,
}) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  // Reset scan state whenever modal opens
  React.useEffect(() => {
    if (visible) {
      setScanned(false);
      setTorch(false);
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !data) return;
    setScanned(true);

    try {
      const parsed = parseUpiQrCode(data);
      let extractedUpi = '';
      let payeeName = parsed.payeeName;

      if (parsed.isValid && parsed.upiId) {
        extractedUpi = parsed.upiId;
      } else if (isValidUpiId(data.trim())) {
        extractedUpi = data.trim();
      }

      if (extractedUpi) {
        Vibration.vibrate(45);
        onScanned(extractedUpi, payeeName);
        onClose();
      } else {
        Alert.alert(
          'No UPI ID Found',
          'This QR code is not a valid UPI payment QR. Please scan a Google Pay, PhonePe, Paytm, or BHIM payment QR code.',
          [
            {
              text: 'Scan Again',
              onPress: () => setScanned(false),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: onClose,
            },
          ]
        );
      }
    } catch (err: any) {
      console.warn('QR scan error:', err);
      Alert.alert('Scan Failed', 'Could not read QR code. Please try again.', [
        { text: 'Retry', onPress: () => setScanned(false) },
      ]);
    }
  };

  const modalTitle =
    title ||
    (friendName ? `Scan ${friendName}'s UPI QR` : "Scan Friend's UPI QR");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.loadingContainer} />
        ) : !permission.granted ? (
          <View style={styles.permissionContainer}>
            <View style={styles.permissionIconCircle}>
              <MaterialCommunityIcons name="camera-off" size={48} color={M3Colors.primary} />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionSubtitle}>
              TripSplit needs camera permission to scan your friend's Google Pay, PhonePe, Paytm, or BHIM QR code.
            </Text>
            <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
              <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Top Bar Overlay */}
            <View style={[styles.topOverlay, { top: Math.max(insets.top + 8, 44) }]}>
              <TouchableOpacity onPress={onClose} style={styles.iconCircle} accessibilityLabel="Close scanner">
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.headerTitle} numberOfLines={1}>
                {modalTitle}
              </Text>

              <TouchableOpacity
                onPress={() => setTorch(!torch)}
                style={styles.iconCircle}
                accessibilityLabel="Toggle flashlight"
              >
                <MaterialCommunityIcons
                  name={torch ? 'flashlight' : 'flashlight-off'}
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Central Viewfinder Reticle */}
            <View style={styles.reticleContainer}>
              <View style={styles.scanBox}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.scanInstruction}>
                Point camera at your friend's payment QR code from Google Pay, PhonePe, or Paytm
              </Text>
            </View>

            {/* Bottom Supported Apps Badge */}
            <View style={[styles.bottomOverlay, { bottom: Math.max(insets.bottom + 24, 40) }]}>
              <View style={styles.supportedBadge}>
                <MaterialCommunityIcons name="shield-check" size={16} color={M3Colors.primaryFixed} />
                <Text style={styles.supportedText}>
                  Supports Google Pay • PhonePe • Paytm • BHIM
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: M3Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: M3Shapes.spacing.xl,
    gap: 12,
  },
  permissionIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    ...M3Typography.headlineSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  permissionSubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  grantBtn: {
    backgroundColor: M3Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: M3Shapes.pill,
  },
  grantBtnText: {
    ...M3Typography.labelLg,
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurfaceVariant,
  },
  topOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...M3Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  reticleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#10B981', // Emerald green
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanInstruction: {
    ...M3Typography.bodyMedium,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 40,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  supportedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: M3Shapes.pill,
  },
  supportedText: {
    ...M3Typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
