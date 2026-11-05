import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthMode = 'login' | 'signup';
type ErrorType = 'VALIDATION' | 'CREDENTIALS' | 'NOT_FOUND' | 'TOO_MANY_REQUESTS' | 'NETWORK' | 'GENERAL' | null;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode: initialModeParam } = useLocalSearchParams<{ mode?: string }>();
  const { signIn, signUp } = useAuth();
  const { showToast } = useToast();
  const scrollViewRef = useRef<any>(null);

  const [authMode, setAuthMode] = useState<AuthMode>(
    initialModeParam === 'signup' ? 'signup' : 'login'
  );

  useEffect(() => {
    if (initialModeParam === 'signup') {
      setAuthMode('signup');
    }
  }, [initialModeParam]);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field Errors
  const [errorMsg, setErrorMsg] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>(null);

  const clearErrors = () => {
    setErrorMsg('');
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmError('');
    setErrorType(null);
  };

  const handleSwitchMode = (newMode: AuthMode) => {
    setAuthMode(newMode);
    clearErrors();
  };

  // 1. Submit Login Flow
  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    let hasValidationError = false;

    if (!trimmedEmail) {
      setEmailError('Email address is required.');
      hasValidationError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      hasValidationError = true;
    } else {
      setEmailError('');
    }

    if (!trimmedPassword) {
      setPasswordError('Password is required.');
      hasValidationError = true;
    } else if (trimmedPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      hasValidationError = true;
    } else {
      setPasswordError('');
    }

    if (hasValidationError) {
      setErrorMsg('Please check the highlighted fields above.');
      setErrorType('VALIDATION');
      return;
    }

    clearErrors();
    setLoading(true);

    try {
      await signIn(trimmedEmail, trimmedPassword);
    } catch (err: any) {
      console.warn('Login error:', err);
      const code = err?.code || '';
      const message = err?.message || '';

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        message.includes('invalid-credential') ||
        message.includes('wrong-password')
      ) {
        setPasswordError('Wrong password or incorrect email');
        setErrorMsg('Wrong password or incorrect email. Please check your credentials.');
        setErrorType('CREDENTIALS');
        showToast({
          title: 'Login Failed',
          message: 'Wrong password or incorrect email. Please check your credentials.',
          type: 'error',
          duration: 4000,
        });
      } else if (
        code === 'auth/user-not-found' ||
        message.includes('user-not-found')
      ) {
        setEmailError('No account found with this email.');
        setErrorMsg('Wrong password or incorrect email. No user found for this email address.');
        setErrorType('NOT_FOUND');
        showToast({
          title: 'Account Not Found',
          message: 'Wrong password or incorrect email. No user found for this email address.',
          type: 'error',
          duration: 4000,
        });
      } else if (
        code === 'auth/invalid-email' ||
        message.includes('invalid-email')
      ) {
        setEmailError('Invalid email format.');
        setErrorMsg('The email address entered is not properly formatted.');
        setErrorType('VALIDATION');
        showToast({
          title: 'Invalid Email',
          message: 'The email address entered is not properly formatted.',
          type: 'error',
          duration: 4000,
        });
      } else if (
        code === 'auth/too-many-requests' ||
        message.includes('too-many-requests')
      ) {
        setErrorMsg('Too many unsuccessful attempts. Account temporarily locked. Please reset your password or try again later.');
        setErrorType('TOO_MANY_REQUESTS');
        showToast({
          title: 'Too Many Attempts',
          message: 'Account temporarily locked. Please try again later.',
          type: 'error',
          duration: 5000,
        });
      } else if (
        code === 'auth/network-request-failed' ||
        message.includes('network')
      ) {
        setErrorMsg('Network error. Please check your internet connection.');
        setErrorType('NETWORK');
        showToast({
          title: 'Connection Error',
          message: 'Network error. Please check your internet connection.',
          type: 'error',
          duration: 4000,
        });
      } else {
        const fallBackMsg = err.message || 'Wrong password or incorrect email. Please verify your credentials.';
        setErrorMsg(fallBackMsg);
        setErrorType('GENERAL');
        showToast({
          title: 'Login Failed',
          message: fallBackMsg,
          type: 'error',
          duration: 4000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Sign Up Flow
  const handleSignUp = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    const trimmedConfirm = confirmPassword;

    let hasValidationError = false;

    if (!trimmedName) {
      setNameError('Full name is required.');
      hasValidationError = true;
    } else {
      setNameError('');
    }

    if (!trimmedEmail) {
      setEmailError('Email address is required.');
      hasValidationError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      hasValidationError = true;
    } else {
      setEmailError('');
    }

    if (!trimmedPassword) {
      setPasswordError('Password is required.');
      hasValidationError = true;
    } else if (trimmedPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      hasValidationError = true;
    } else {
      setPasswordError('');
    }

    if (!trimmedConfirm) {
      setConfirmError('Please confirm your password.');
      hasValidationError = true;
    } else if (trimmedPassword !== trimmedConfirm) {
      setConfirmError('Passwords do not match.');
      hasValidationError = true;
    } else {
      setConfirmError('');
    }

    if (hasValidationError) {
      setErrorMsg('Please check the highlighted fields above.');
      setErrorType('VALIDATION');
      return;
    }

    clearErrors();
    setLoading(true);

    try {
      await signUp(trimmedEmail, trimmedPassword, trimmedName);
    } catch (err: any) {
      console.warn('Sign up error:', err);
      const code = err?.code || '';
      const message = err?.message || '';

      if (code === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
        setEmailError('This email is already registered.');
        setErrorMsg('An account already exists with this email. Switch to Log In.');
        setErrorType('VALIDATION');
        showToast({
          title: 'Email In Use',
          message: 'An account already exists with this email. Switch to Log In.',
          type: 'error',
          duration: 4000,
        });
      } else if (code === 'auth/weak-password' || message.includes('weak-password')) {
        setPasswordError('Password is too weak (use 6+ characters).');
        setErrorMsg('Password should be at least 6 characters.');
        setErrorType('VALIDATION');
        showToast({
          title: 'Weak Password',
          message: 'Password must be at least 6 characters.',
          type: 'error',
          duration: 4000,
        });
      } else {
        const fallBack = err.message || 'Registration failed. Please try again.';
        setErrorMsg(fallBack);
        setErrorType('GENERAL');
        showToast({
          title: 'Sign Up Failed',
          message: fallBack,
          type: 'error',
          duration: 4000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const isLogin = authMode === 'login';

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top, 24) + 12, paddingBottom: Math.max(insets.bottom, 20) + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <Image
              source={require('../../assets/images/app_logo_modern.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appTitle}>TripSplit</Text>
            <Text style={styles.tagline}>
              {isLogin
                ? 'Welcome back! Log in to manage your group travel expenses'
                : 'Create an account to track, split, and settle trip expenses'}
            </Text>
          </View>

          {/* Segmented Auth Switcher (Log In | Sign Up) */}
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              onPress={() => handleSwitchMode('login')}
              style={[styles.segmentBtn, isLogin && styles.segmentBtnActive]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="login"
                size={18}
                color={isLogin ? M3Colors.primary : M3Colors.onSurfaceVariant}
              />
              <Text style={[styles.segmentBtnText, isLogin && styles.segmentBtnTextActive]}>
                Log In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSwitchMode('signup')}
              style={[styles.segmentBtn, !isLogin && styles.segmentBtnActive]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="account-plus"
                size={18}
                color={!isLogin ? M3Colors.primary : M3Colors.onSurfaceVariant}
              />
              <Text style={[styles.segmentBtnText, !isLogin && styles.segmentBtnTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Global Error Banner */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={M3Colors.error} />
                <View style={styles.errorTextWrap}>
                  <Text style={styles.errorTitle}>
                    {errorType === 'CREDENTIALS'
                      ? 'Authentication Failed'
                      : errorType === 'NOT_FOUND'
                      ? 'Account Not Found'
                      : errorType === 'NETWORK'
                      ? 'Connection Error'
                      : 'Please check your inputs'}
                  </Text>
                  <Text style={styles.errorMessage}>{errorMsg}</Text>
                </View>
              </View>
            ) : null}

            {/* Sign Up: Full Name Input */}
            {!isLogin && (
              <View style={styles.fieldWrapper}>
                <TextInput
                  label="Full Name *"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (nameError) setNameError('');
                    if (errorMsg) setErrorMsg('');
                  }}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={nameError ? M3Colors.error : M3Colors.outlineVariant}
                  activeOutlineColor={nameError ? M3Colors.error : M3Colors.primary}
                  error={Boolean(nameError)}
                  left={<TextInput.Icon icon="account-outline" color={nameError ? M3Colors.error : undefined} />}
                  returnKeyType="next"
                />
                {nameError ? (
                  <HelperText type="error" visible={Boolean(nameError)} style={styles.fieldError}>
                    {nameError}
                  </HelperText>
                ) : null}
              </View>
            )}

            {/* Email Input */}
            <View style={styles.fieldWrapper}>
              <TextInput
                label="Email Address *"
                placeholder="name@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                  if (errorMsg) setErrorMsg('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                style={styles.input}
                outlineColor={emailError ? M3Colors.error : M3Colors.outlineVariant}
                activeOutlineColor={emailError ? M3Colors.error : M3Colors.primary}
                error={Boolean(emailError)}
                left={<TextInput.Icon icon="email-outline" color={emailError ? M3Colors.error : undefined} />}
                returnKeyType="next"
              />
              {emailError ? (
                <HelperText type="error" visible={Boolean(emailError)} style={styles.fieldError}>
                  {emailError}
                </HelperText>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.fieldWrapper}>
              <TextInput
                label="Password *"
                placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                  if (errorMsg) setErrorMsg('');
                }}
                secureTextEntry={!showPassword}
                mode="outlined"
                style={styles.input}
                outlineColor={passwordError ? M3Colors.error : M3Colors.outlineVariant}
                activeOutlineColor={passwordError ? M3Colors.error : M3Colors.primary}
                error={Boolean(passwordError)}
                left={<TextInput.Icon icon="lock-outline" color={passwordError ? M3Colors.error : undefined} />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                returnKeyType={isLogin ? 'done' : 'next'}
                onSubmitEditing={isLogin ? handleLogin : undefined}
              />
              {passwordError ? (
                <HelperText type="error" visible={Boolean(passwordError)} style={styles.fieldError}>
                  {passwordError}
                </HelperText>
              ) : null}
            </View>

            {/* Sign Up: Confirm Password Input */}
            {!isLogin && (
              <View style={styles.fieldWrapper}>
                <TextInput
                  label="Confirm Password *"
                  placeholder="Re-type your password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (confirmError) setConfirmError('');
                    if (errorMsg) setErrorMsg('');
                  }}
                  secureTextEntry={!showPassword}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={confirmError ? M3Colors.error : M3Colors.outlineVariant}
                  activeOutlineColor={confirmError ? M3Colors.error : M3Colors.primary}
                  error={Boolean(confirmError)}
                  left={<TextInput.Icon icon="lock-check-outline" color={confirmError ? M3Colors.error : undefined} />}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
                {confirmError ? (
                  <HelperText type="error" visible={Boolean(confirmError)} style={styles.fieldError}>
                    {confirmError}
                  </HelperText>
                ) : null}
              </View>
            )}

            {/* Login: Forgot Password Link */}
            {isLogin && (
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                style={styles.forgotBtn}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Main Action Button */}
            <Button
              mode="contained"
              onPress={isLogin ? handleLogin : handleSignUp}
              loading={loading}
              disabled={loading}
              style={styles.actionBtn}
              contentStyle={styles.actionBtnContent}
              buttonColor={M3Colors.primary}
              icon={isLogin ? 'login' : 'account-plus'}
            >
              {isLogin ? 'Log In' : 'Create Account'}
            </Button>
          </View>

          {/* Quick Footer Switch */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {isLogin ? "Don't have an account yet?" : 'Already have an account?'}
            </Text>
            <TouchableOpacity onPress={() => handleSwitchMode(isLogin ? 'signup' : 'login')}>
              <Text style={styles.footerLink}>
                {isLogin ? ' Sign Up Now' : ' Log In Here'}
              </Text>
            </TouchableOpacity>
          </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: M3Shapes.spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 104,
    height: 104,
    marginBottom: 8,
  },
  appTitle: {
    ...M3Typography.displaySm,
    color: M3Colors.primary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 19,
    fontSize: 13,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 245, 242, 0.85)',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 33, 20, 0.08)',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  segmentBtnText: {
    ...M3Typography.labelLarge,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: M3Colors.primary,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    padding: M3Shapes.spacing.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 33, 20, 0.08)',
  },
  fieldWrapper: {
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  fieldError: {
    marginTop: 2,
    marginLeft: -4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    marginBottom: 10,
  },
  forgotText: {
    ...M3Typography.labelMedium,
    color: M3Colors.primary,
    fontWeight: '600',
  },
  actionBtn: {
    borderRadius: M3Shapes.pill,
    marginTop: 10,
    elevation: 2,
  },
  actionBtnContent: {
    paddingVertical: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: M3Colors.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorTitle: {
    ...M3Typography.labelMedium,
    color: M3Colors.error,
    fontWeight: '700',
    marginBottom: 2,
  },
  errorMessage: {
    ...M3Typography.bodySmall,
    color: '#991B1B',
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 10,
  },
  footerText: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    fontSize: 13,
  },
  footerLink: {
    ...M3Typography.labelLarge,
    color: M3Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
