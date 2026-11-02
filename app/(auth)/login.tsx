import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ErrorType = 'VALIDATION' | 'CREDENTIALS' | 'NOT_FOUND' | 'TOO_MANY_REQUESTS' | 'NETWORK' | 'GENERAL' | null;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const scrollViewRef = useRef<any>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Error handling states
  const [errorMsg, setErrorMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>(null);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    let hasValidationError = false;

    // Validate Email
    if (!trimmedEmail) {
      setEmailError('Email address is required.');
      hasValidationError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address (e.g. name@example.com).');
      hasValidationError = true;
    } else {
      setEmailError('');
    }

    // Validate Password
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

    // Clear previous errors before submission
    setErrorMsg('');
    setEmailError('');
    setPasswordError('');
    setErrorType(null);
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
        setPasswordError('Incorrect password');
        setErrorMsg('Incorrect email or password. Please verify and try again.');
        setErrorType('CREDENTIALS');
      } else if (
        code === 'auth/user-not-found' ||
        message.includes('user-not-found')
      ) {
        setEmailError('No account found');
        setErrorMsg('No account found with this email. Would you like to create one?');
        setErrorType('NOT_FOUND');
      } else if (
        code === 'auth/invalid-email' ||
        message.includes('invalid-email')
      ) {
        setEmailError('Invalid email format');
        setErrorMsg('The email address entered is not valid.');
        setErrorType('VALIDATION');
      } else if (
        code === 'auth/too-many-requests' ||
        message.includes('too-many-requests')
      ) {
        setErrorMsg('Too many unsuccessful attempts. Access is temporarily locked for security. Please try again later or reset your password.');
        setErrorType('TOO_MANY_REQUESTS');
      } else if (
        code === 'auth/user-disabled' ||
        message.includes('user-disabled')
      ) {
        setErrorMsg('This account has been disabled. Please contact support.');
        setErrorType('GENERAL');
      } else if (
        code === 'auth/network-request-failed' ||
        message.includes('network-request-failed')
      ) {
        setErrorMsg('Network connection error. Please check your internet connection.');
        setErrorType('NETWORK');
      } else if (
        code === 'auth/internal-error' ||
        message.includes('internal-error')
      ) {
        setErrorMsg('Firebase service is temporarily unavailable. Please try again or use Demo Account.');
        setErrorType('GENERAL');
      } else {
        setErrorMsg(err?.message || 'Failed to sign in. Please check your credentials and try again.');
        setErrorType('GENERAL');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    setEmailError('');
    setPasswordError('');
    setErrorType(null);
    const demoEmail = 'demo@tripsplit.app';
    const demoPass = 'TripSplitDemo2026!';
    try {
      await signIn(demoEmail, demoPass);
    } catch (err: any) {
      console.warn('Demo login error:', err);
      setErrorMsg(err?.message || 'Demo login failed. Please try again.');
      setErrorType('GENERAL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24) + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="wallet-travel" size={36} color={M3Colors.onPrimary} />
          </View>
          <Text style={styles.appTitle}>TripSplit</Text>
          <Text style={styles.tagline}>
            Smart group expenses, fair splits & instant UPI settlements with cloud backup
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>
            Sign in to access your trips and cloud backup
          </Text>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <View style={styles.errorBannerHeader}>
                <MaterialCommunityIcons
                  name={
                    errorType === 'NETWORK'
                      ? 'wifi-off'
                      : errorType === 'TOO_MANY_REQUESTS'
                      ? 'lock-clock'
                      : errorType === 'NOT_FOUND'
                      ? 'account-question-outline'
                      : 'alert-circle-outline'
                  }
                  size={20}
                  color={M3Colors.onErrorContainer}
                />
                <Text style={styles.errorText}>{errorMsg}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setErrorMsg('');
                    setErrorType(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={18} color={M3Colors.onErrorContainer} />
                </TouchableOpacity>
              </View>

              {errorType === 'NOT_FOUND' ? (
                <TouchableOpacity
                  style={styles.errorActionBtn}
                  onPress={() => router.push('/(auth)/register')}
                >
                  <MaterialCommunityIcons name="account-plus-outline" size={16} color={M3Colors.primary} />
                  <Text style={styles.errorActionText}>Create an Account</Text>
                </TouchableOpacity>
              ) : null}

              {errorType === 'CREDENTIALS' || errorType === 'TOO_MANY_REQUESTS' ? (
                <TouchableOpacity
                  style={styles.errorActionBtn}
                  onPress={() => router.push('/(auth)/forgot-password')}
                >
                  <MaterialCommunityIcons name="lock-reset" size={16} color={M3Colors.primary} />
                  <Text style={styles.errorActionText}>Reset Your Password</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={styles.inputWrapper}>
            <TextInput
              label="Email Address"
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

          <View style={styles.inputWrapper}>
            <TextInput
              label="Password"
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
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            {passwordError ? (
              <HelperText type="error" visible={Boolean(passwordError)} style={styles.fieldError}>
                {passwordError}
              </HelperText>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginBtn}
            contentStyle={styles.loginBtnContent}
            buttonColor={M3Colors.primary}
            icon="login"
          >
            Log In
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            mode="outlined"
            onPress={handleDemoLogin}
            disabled={loading}
            icon="lightning-bolt"
            textColor={M3Colors.primary}
            style={styles.demoBtn}
          >
            Try Demo Account
          </Button>
        </View>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}> Sign Up</Text>
          </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    padding: M3Shapes.spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
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
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    ...M3Typography.headlineSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  cardSubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: 18,
  },
  errorBanner: {
    backgroundColor: M3Colors.errorContainer,
    padding: 12,
    borderRadius: M3Shapes.cardSmall,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: {
    ...M3Typography.bodySm,
    color: M3Colors.onErrorContainer,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  errorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    marginTop: 10,
    marginLeft: 28,
    gap: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  errorActionText: {
    ...M3Typography.labelSm,
    color: M3Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  inputWrapper: {
    marginBottom: 10,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  fieldError: {
    paddingHorizontal: 4,
    marginTop: 2,
    fontSize: 12,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    paddingVertical: 4,
  },
  forgotText: {
    ...M3Typography.labelMd,
    color: M3Colors.primary,
    fontWeight: '600',
  },
  loginBtn: {
    borderRadius: M3Shapes.pill,
  },
  loginBtnContent: {
    paddingVertical: 6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: M3Colors.outlineVariant,
  },
  dividerText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    marginHorizontal: 12,
    fontWeight: '600',
  },
  demoBtn: {
    borderRadius: M3Shapes.pill,
    borderColor: M3Colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
  },
  footerLink: {
    ...M3Typography.bodyMedium,
    color: M3Colors.primary,
    fontWeight: '700',
  },
});
