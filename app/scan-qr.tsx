import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { parseUpiUri, isValidUpiId } from '../src/services/upi/upiParser';
import { M3Colors } from '../src/theme/colors';
import { M3Typography } from '../src/theme/typography';
import { M3Shapes } from '../src/theme/shapes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

export default function ScanQrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { returnTarget } = useLocalSearchParams<{ returnTarget?: string }>();
  const { updateUpi } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  if (!permission) {
    return <View style={styles.loadingContainer} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIconCircle}>
          <MaterialCommunityIcons name="camera-off" size={48} color={M3Colors.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionSubtitle}>
          TripSplit needs camera permission to scan Google Pay, PhonePe, Paytm, and BHIM UPI QR codes.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
          <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // 1. Parse UPI URI or direct UPI string
      let extractedUpiId = '';
      let payeeName = '';

      if (data.startsWith('upi://pay')) {
        const parsed = parseUpiUri(data);
        if (parsed.upiId) {
          extractedUpiId = parsed.upiId;
          payeeName = parsed.payeeName || '';
        }
      } else if (isValidUpiId(data.trim())) {
        extractedUpiId = data.trim();
      }

      // Check if this is a group invitation QR code
      let groupInviteCode = '';
      if (data.includes('tripsplit://join') || data.includes('code=')) {
        const match = data.match(/code=([A-Za-z0-9]+)/);
        if (match) groupInviteCode = match[1];
      } else if (/^[2-9A-Z]{8,10}$/i.test(data.trim())) {
        groupInviteCode = data.trim().toUpperCase();
      }

      if (groupInviteCode) {
        router.replace({ pathname: '/join-group', params: { code: groupInviteCode } });
        return;
      }

      if (!extractedUpiId) {
        Alert.alert(
          'Unsupported QR Code',
          'This QR code is neither a valid UPI address nor a TripSplit group invitation. Please scan a valid UPI or Group QR code.',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
        return;
      }

      // 2. Process based on caller
      if (returnTarget === 'profile' || returnTarget === 'wizard') {
        await updateUpi(extractedUpiId);
        Alert.alert(
          'UPI ID Linked',
          `Successfully saved your personal UPI ID: ${extractedUpiId}${payeeName ? ` (${payeeName})` : ''}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'UPI QR Detected',
          `Payee: ${payeeName || 'Unknown'}\nUPI ID: ${extractedUpiId}`,
          [
            { text: 'Copy / Done', onPress: () => router.back() },
            {
              text: 'Save to Profile',
              onPress: async () => {
                await updateUpi(extractedUpiId);
                router.back();
              },
            },
          ]
        );
      }
    } catch (err: any) {
      console.warn('QR scan processing error:', err);
      Alert.alert('Scan Error', 'Failed to process QR code. Please try again.', [
        { text: 'Retry', onPress: () => setScanned(false) },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Top Controls Overlay */}
      <View style={[styles.topOverlay, { top: Math.max(insets.top + 8, 44) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconCircle}>
          <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {returnTarget === 'profile' ? 'Link Your UPI ID' : 'Scan UPI QR'}
        </Text>

        <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.iconCircle}>
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
          {/* 4 Corner Markers */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.scanInstruction}>
          {returnTarget === 'profile'
            ? 'Point camera at your personal Google Pay, PhonePe, or Paytm QR code to link your UPI ID'
            : 'Point camera at a Google Pay, PhonePe, Paytm or BHIM payment QR code'}
        </Text>
      </View>

      {/* Bottom Manual Action */}
      <View style={styles.bottomOverlay}>
        {scanned ? (
          <TouchableOpacity onPress={() => setScanned(false)} style={styles.rescanBtn}>
            <MaterialCommunityIcons name="refresh" size={20} color={M3Colors.onPrimary} />
            <Text style={styles.rescanText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.supportedBadge}>
            <MaterialCommunityIcons name="shield-check" size={16} color={M3Colors.onPrimary} />
            <Text style={styles.supportedText}>NPCI UPI 2.0 Compliant Scanner</Text>
          </View>
        )}
      </View>
    </View>
  );
}

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
    top: 50,
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
    borderColor: M3Colors.primaryFixed,
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
    bottom: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: M3Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: M3Shapes.pill,
  },
  rescanText: {
    ...M3Typography.labelLg,
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  supportedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: M3Shapes.pill,
  },
  supportedText: {
    ...M3Typography.labelSm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
