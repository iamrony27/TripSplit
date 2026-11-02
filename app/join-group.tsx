import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/context/AuthContext';
import { useTrips } from '../src/context/TripContext';
import { validateInvitationCode } from '../src/services/firebase/invitationService';
import { Trip } from '../src/types/trip';
import { GroupInvitation } from '../src/types/invitation';
import { M3Colors } from '../src/theme/colors';
import { M3Typography } from '../src/theme/typography';
import { M3Shapes } from '../src/theme/shapes';
import { safeGoBack } from '../src/utils/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 260);

type Step = 'INPUT' | 'PREVIEW';

export default function JoinGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();
  const { user } = useAuth();
  const { joinTripWithCode, playNotificationSound } = useTrips();

  const [step, setStep] = useState<Step>('INPUT');
  const [activeMode, setActiveMode] = useState<'MANUAL' | 'CAMERA'>('MANUAL');

  // Input states
  const [code, setCode] = useState(params.code || '');
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Validated Group state
  const [validatedTrip, setValidatedTrip] = useState<Trip | null>(null);
  const [validatedInvitation, setValidatedInvitation] = useState<GroupInvitation | null>(null);

  // Applicant fields
  const [applicantName, setApplicantName] = useState(user?.fullName || '');
  const [applicantEmail, setApplicantEmail] = useState(user?.email || '');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantUpi, setApplicantUpi] = useState(user?.upiId || '');
  const [submitting, setSubmitting] = useState(false);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);

  // 1. Auto-load saved invitation code & saved phone/name so user never has to re-enter
  useEffect(() => {
    const loadSavedCodeAndDetails = async () => {
      try {
        if (!params.code) {
          const savedCode = await AsyncStorage.getItem('@tripsplit_saved_invitation_code');
          if (savedCode && savedCode.trim()) {
            setCode(savedCode.trim());
            handleValidateCode(savedCode.trim());
          }
        }
        const savedPhone = await AsyncStorage.getItem('@tripsplit_active_phone');
        if (savedPhone) setApplicantPhone(savedPhone);
        const savedName = await AsyncStorage.getItem('@tripsplit_active_name');
        if (savedName && !user?.fullName) setApplicantName(savedName);
      } catch (err) {
        console.warn('Failed to load saved invite code from storage:', err);
      }
    };
    loadSavedCodeAndDetails();
  }, []);

  // Auto-validate if code passed via params
  useEffect(() => {
    if (params.code) {
      handleValidateCode(params.code);
    }
  }, [params.code]);

  // Sync user info if user logs in
  useEffect(() => {
    if (user) {
      setApplicantName(user.fullName || '');
      setApplicantEmail(user.email || '');
      setApplicantUpi(user.upiId || '');
    }
  }, [user]);

  const handleValidateCode = async (codeToValidate: string) => {
    const cleanCode = codeToValidate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode) {
      setErrorMsg('Please enter an invitation code.');
      return;
    }
    setErrorMsg('');
    setValidating(true);
    try {
      const result = await validateInvitationCode(cleanCode);
      setValidatedTrip(result.trip);
      setValidatedInvitation(result.invitation);
      setCode(cleanCode);
      // Save valid code in storage immediately so it persists
      await AsyncStorage.setItem('@tripsplit_saved_invitation_code', cleanCode);
      setStep('PREVIEW');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid invitation code.');
    } finally {
      setValidating(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (validating) return;

    let extractedCode = data.trim();
    if (extractedCode.includes('code=')) {
      const match = extractedCode.match(/code=([A-Za-z0-9]+)/);
      if (match) extractedCode = match[1];
    } else if (extractedCode.includes('/join/')) {
      const parts = extractedCode.split('/join/');
      if (parts[1]) extractedCode = parts[1].split('?')[0];
    }

    handleValidateCode(extractedCode);
  };

  const handleSubmitJoin = async () => {
    if (!validatedTrip || !validatedInvitation) return;

    if (!applicantName.trim()) {
      Alert.alert('Required', 'Please enter your name so the group admin recognizes you.');
      return;
    }

    if (!user && !applicantPhone.trim() && !applicantEmail.trim()) {
      Alert.alert('Required', 'Please enter your phone number so group members can identify you.');
      return;
    }

    setSubmitting(true);
    try {
      await joinTripWithCode({
        tripId: validatedTrip.id,
        tripTitle: validatedTrip.title,
        invitationCode: validatedInvitation.code,
        applicantUserId: user?.id,
        applicantName: applicantName.trim(),
        applicantPhone: applicantPhone.trim() || undefined,
        applicantEmail: applicantEmail.trim() || undefined,
        applicantUpiId: applicantUpi.trim() || undefined,
      });

      // Save invitation code & phone info in AsyncStorage
      await AsyncStorage.setItem('@tripsplit_saved_invitation_code', validatedInvitation.code);
      if (applicantPhone.trim()) {
        await AsyncStorage.setItem('@tripsplit_active_phone', applicantPhone.trim());
      }
      if (applicantName.trim()) {
        await AsyncStorage.setItem('@tripsplit_active_name', applicantName.trim());
      }

      // Play chime
      playNotificationSound().catch(() => {});

      // Navigate straight to the trip view - completely bypassing any approval pending page!
      Alert.alert(
        'Welcome!',
        `You have joined "${validatedTrip.title}".`,
        [
          {
            text: 'Open Trip',
            onPress: () => {
              router.replace(`/trip/${validatedTrip.id}` as any);
            },
          },
        ],
        { cancelable: false }
      );
    } catch (err: any) {
      Alert.alert('Join Error', err.message || 'Failed to join group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'PREVIEW') {
              setStep('INPUT');
            } else {
              safeGoBack(router, '/(auth)/login');
            }
          }}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={M3Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'INPUT'
            ? 'Join a Group'
            : step === 'PREVIEW'
            ? 'Group Preview'
            : 'Request Sent'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ================= STEP 1: INPUT OR SCAN ================= */}
      {step === 'INPUT' && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mode Switch Tabs */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              onPress={() => setActiveMode('MANUAL')}
              style={[styles.modeTab, activeMode === 'MANUAL' && styles.modeTabActive]}
            >
              <MaterialCommunityIcons
                name="form-textbox"
                size={18}
                color={activeMode === 'MANUAL' ? M3Colors.onPrimary : M3Colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.modeTabText,
                  activeMode === 'MANUAL' && styles.modeTabTextActive,
                ]}
              >
                Enter Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveMode('CAMERA')}
              style={[styles.modeTab, activeMode === 'CAMERA' && styles.modeTabActive]}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={18}
                color={activeMode === 'CAMERA' ? M3Colors.onPrimary : M3Colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.modeTabText,
                  activeMode === 'CAMERA' && styles.modeTabTextActive,
                ]}
              >
                Scan QR Code
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode: Manual Code Entry */}
          {activeMode === 'MANUAL' && (
            <View style={styles.card}>
              <View style={styles.badgeCircle}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={36} color={M3Colors.primary} />
              </View>

              <Text style={styles.cardHeading}>Enter Group Invitation Code</Text>
              <Text style={styles.cardSubheading}>
                Ask the group creator or admin for the 8-character invitation code.
              </Text>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color={M3Colors.onErrorContainer} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <TextInput
                label="Invitation Code"
                placeholder="e.g. TRIP8X4K"
                value={code}
                onChangeText={(t) => {
                  setCode(t.toUpperCase());
                  if (errorMsg) setErrorMsg('');
                }}
                autoCapitalize="characters"
                maxLength={12}
                mode="outlined"
                outlineColor={M3Colors.outlineVariant}
                activeOutlineColor={M3Colors.primary}
                style={styles.codeInput}
                left={<TextInput.Icon icon="key-variant" />}
              />

              <Button
                mode="contained"
                onPress={() => handleValidateCode(code)}
                loading={validating}
                disabled={validating || !code.trim()}
                buttonColor={M3Colors.primary}
                textColor={M3Colors.onPrimary}
                style={styles.continueBtn}
                contentStyle={styles.btnContent}
              >
                Continue
              </Button>
            </View>
          )}

          {/* Mode: QR Code Scanner */}
          {activeMode === 'CAMERA' && (
            <View style={styles.cameraWrapper}>
              {!permission?.granted ? (
                <View style={styles.permissionCard}>
                  <MaterialCommunityIcons name="camera-off" size={40} color={M3Colors.primary} />
                  <Text style={styles.permTitle}>Camera Permission Needed</Text>
                  <Text style={styles.permSub}>
                    Allow camera access to scan your friend's group invitation QR code.
                  </Text>
                  <Button mode="contained" onPress={requestPermission} buttonColor={M3Colors.primary}>
                    Grant Camera Access
                  </Button>
                </View>
              ) : (
                <View style={styles.cameraBox}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    enableTorch={torch}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={validating ? undefined : handleBarcodeScanned}
                  />

                  {/* Viewfinder Reticle */}
                  <View style={styles.reticleOverlay}>
                    <View style={styles.reticleFrame}>
                      <View style={[styles.corner, styles.tl]} />
                      <View style={[styles.corner, styles.tr]} />
                      <View style={[styles.corner, styles.bl]} />
                      <View style={[styles.corner, styles.br]} />
                    </View>
                    <Text style={styles.reticleHint}>
                      Align group invitation QR code within frame
                    </Text>
                  </View>

                  {/* Torch toggle */}
                  <TouchableOpacity
                    onPress={() => setTorch(!torch)}
                    style={styles.torchBtn}
                  >
                    <MaterialCommunityIcons
                      name={torch ? 'flashlight' : 'flashlight-off'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Explain Admin Approval Policy */}
          <View style={styles.policyNotice}>
            <MaterialCommunityIcons name="shield-account-outline" size={20} color={M3Colors.primary} />
            <Text style={styles.policyNoticeText}>
              Security Policy: Submitting an invitation code creates a pending join request. The group administrator must verify and approve your request before access is granted.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ================= STEP 2: GROUP PREVIEW & APPLICANT FORM ================= */}
      {step === 'PREVIEW' && validatedTrip && validatedInvitation && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group Details Card */}
          <View style={styles.groupPreviewCard}>
            <View style={styles.groupHeaderRow}>
              <View style={styles.groupIconCircle}>
                <MaterialCommunityIcons name="wallet-travel" size={32} color={M3Colors.primary} />
              </View>
              <View style={styles.groupHeaderCol}>
                <Text style={styles.groupTitle} numberOfLines={1}>
                  {validatedTrip.title}
                </Text>
                <Text style={styles.groupOrganizer}>
                  Organized by {validatedInvitation.createdByName}
                </Text>
              </View>
            </View>

            {validatedTrip.description ? (
              <Text style={styles.groupDescription}>{validatedTrip.description}</Text>
            ) : null}

            <View style={styles.groupMetaRow}>
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name="account-group" size={16} color={M3Colors.primary} />
                <Text style={styles.metaChipText}>
                  {validatedTrip.members.length} Members
                </Text>
              </View>
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name="currency-inr" size={16} color={M3Colors.secondary} />
                <Text style={styles.metaChipText}>
                  {validatedTrip.baseCurrency}
                </Text>
              </View>
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name="shield-check" size={16} color={M3Colors.primary} />
                <Text style={styles.metaChipText}>Code: {validatedInvitation.code}</Text>
              </View>
            </View>
          </View>

          {/* Applicant Info Form */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>Your Details</Text>
            <Text style={styles.formSubtitle}>
              {user
                ? `Logged in as ${user.fullName} (${user.email})`
                : 'Enter your name so the group admin can verify and approve your request.'}
            </Text>

            <TextInput
              label="Your Full Name *"
              placeholder="e.g. Sarah Jenkins"
              value={applicantName}
              onChangeText={setApplicantName}
              mode="outlined"
              outlineColor={M3Colors.outlineVariant}
              activeOutlineColor={M3Colors.primary}
              style={styles.input}
              left={<TextInput.Icon icon="account-outline" />}
            />

            {!user && (
              <>
                <TextInput
                  label="Mobile Number *"
                  placeholder="e.g. 9876543210"
                  value={applicantPhone}
                  onChangeText={setApplicantPhone}
                  keyboardType="phone-pad"
                  mode="outlined"
                  outlineColor={M3Colors.outlineVariant}
                  activeOutlineColor={M3Colors.primary}
                  style={styles.input}
                  left={<TextInput.Icon icon="cellphone" />}
                />

                <TextInput
                  label="Email Address (Optional)"
                  placeholder="e.g. user@example.com"
                  value={applicantEmail}
                  onChangeText={setApplicantEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  mode="outlined"
                  outlineColor={M3Colors.outlineVariant}
                  activeOutlineColor={M3Colors.primary}
                  style={styles.input}
                  left={<TextInput.Icon icon="email-outline" />}
                />

                <TextInput
                  label="UPI ID for settlements (Optional)"
                  placeholder="e.g. user@okhdfcbank"
                  value={applicantUpi}
                  onChangeText={setApplicantUpi}
                  mode="outlined"
                  outlineColor={M3Colors.outlineVariant}
                  activeOutlineColor={M3Colors.primary}
                  style={styles.input}
                  left={<TextInput.Icon icon="qrcode-scan" />}
                />
              </>
            )}

            <Button
              mode="contained"
              onPress={handleSubmitJoin}
              loading={submitting}
              disabled={submitting}
              buttonColor={M3Colors.primary}
              textColor={M3Colors.onPrimary}
              style={styles.submitJoinBtn}
              contentStyle={styles.btnContent}
              icon="account-plus"
            >
              Join Group Now
            </Button>

            {!user && (
              <View style={styles.authPromptRow}>
                <Text style={styles.authPromptText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.authPromptLink}> Log In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: M3Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: M3Colors.surfaceContainerHigh,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '800',
  },
  scrollContent: {
    padding: M3Shapes.spacing.md,
    gap: 14,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.pill,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: M3Shapes.pill,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: M3Colors.primary,
  },
  modeTabText: {
    ...M3Typography.labelMd,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  cardHeading: {
    ...M3Typography.headlineSm,
    color: M3Colors.onSurface,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardSubheading: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.errorContainer,
    padding: 10,
    borderRadius: M3Shapes.cardSmall,
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    ...M3Typography.bodySm,
    color: M3Colors.onErrorContainer,
    flex: 1,
  },
  codeInput: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  continueBtn: {
    borderRadius: M3Shapes.pill,
    marginTop: 4,
  },
  btnContent: {
    paddingVertical: 6,
  },
  cameraWrapper: {
    height: 380,
    borderRadius: M3Shapes.cardLarge,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 3,
  },
  cameraBox: {
    flex: 1,
    position: 'relative',
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleFrame: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: M3Colors.primaryFixed,
  },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  reticleHint: {
    ...M3Typography.bodySm,
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
  },
  torchBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  permTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  permSub: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 8,
  },
  policyNotice: {
    flexDirection: 'row',
    backgroundColor: M3Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: M3Shapes.cardMedium,
    gap: 10,
    alignItems: 'center',
  },
  policyNoticeText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  groupPreviewCard: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: M3Colors.primaryContainer,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  groupIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupHeaderCol: {
    flex: 1,
  },
  groupTitle: {
    ...M3Typography.titleLarge,
    color: M3Colors.onSurface,
    fontWeight: '800',
  },
  groupOrganizer: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  groupDescription: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 20,
  },
  groupMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: M3Shapes.pill,
    gap: 6,
  },
  metaChipText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  formTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '800',
    marginBottom: 2,
  },
  formSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    marginBottom: 12,
  },
  submitJoinBtn: {
    borderRadius: M3Shapes.pill,
    marginTop: 6,
  },
  authPromptRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  authPromptText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
  },
  authPromptLink: {
    ...M3Typography.bodySm,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  submittedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: M3Shapes.spacing.xl,
    gap: 16,
  },
  submittedCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  submittedTitle: {
    ...M3Typography.headlineMedium,
    color: M3Colors.onSurface,
    fontWeight: '800',
    textAlign: 'center',
  },
  submittedSubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  statusInfoBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: M3Shapes.cardMedium,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
    gap: 8,
    width: '100%',
    marginTop: 8,
  },
  statusInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusInfoLabel: {
    ...M3Typography.labelMd,
    color: '#BF360C',
    fontWeight: '700',
  },
  statusInfoValue: {
    ...M3Typography.labelLarge,
    color: '#E65100',
    fontWeight: '800',
  },
  statusExpl: {
    ...M3Typography.bodySm,
    color: '#5D4037',
    fontSize: 12,
    lineHeight: 17,
  },
  submittedActions: {
    width: '100%',
    gap: 10,
    marginTop: 16,
  },
  homeBtn: {
    borderRadius: M3Shapes.pill,
  },
  createAccountBtn: {
    borderRadius: M3Shapes.pill,
    borderColor: M3Colors.primary,
  },
});
