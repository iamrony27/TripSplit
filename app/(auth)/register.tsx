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
import { safeGoBack } from '../../src/utils/navigation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const scrollViewRef = useRef<any>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Error states
  const [errorMsg, setErrorMsg] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const handleRegister = async () => {
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
      setPasswordError('Password must be at least 6 characters long.');
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
      return;
    }

    setErrorMsg('');
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmError('');
    setLoading(true);

    try {
      await signUp(trimmedEmail, trimmedPassword, trimmedName);
    } catch (err: any) {
      console.warn('Registration error:', err);
      let msg = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try logging in.';
        setEmailError('Email already in use');
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
        setEmailError('Invalid email format');
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use a stronger password.';
        setPasswordError('Password too weak');
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection error. Please check your internet connection.';
      }
      setErrorMsg(msg);
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
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 24) + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(auth)/login')}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={M3Colors.onSurface} />
        </TouchableOpacity>

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Text style={styles.appTitle}>Create Account</Text>
          <Text style={styles.tagline}>
            Start tracking trips, expenses & smart settlements
          </Text>
        </View>

        {/* Registration Card */}
        <View style={styles.card}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={M3Colors.onErrorContainer} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputWrapper}>
            <TextInput
              label="Full Name"
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
              label="Password (min 6 characters)"
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
              returnKeyType="next"
            />
            {passwordError ? (
              <HelperText type="error" visible={Boolean(passwordError)} style={styles.fieldError}>
                {passwordError}
              </HelperText>
            ) : null}
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              label="Confirm Password"
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
              onSubmitEditing={handleRegister}
            />
            {confirmError ? (
              <HelperText type="error" visible={Boolean(confirmError)} style={styles.fieldError}>
                {confirmError}
              </HelperText>
            ) : null}
          </View>

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.registerBtn}
            contentStyle={styles.registerBtnContent}
            buttonColor={M3Colors.primary}
          >
            Sign Up
          </Button>
        </View>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}> Log In</Text>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandContainer: {
    marginBottom: 16,
  },
  appTitle: {
    ...M3Typography.displaySm,
    color: M3Colors.onSurface,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    marginTop: 4,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.errorContainer,
    padding: 10,
    borderRadius: M3Shapes.cardSmall,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    ...M3Typography.bodySm,
    color: M3Colors.onErrorContainer,
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  fieldError: {
    paddingHorizontal: 4,
    marginTop: 2,
    fontSize: 12,
  },
  registerBtn: {
    borderRadius: M3Shapes.pill,
    marginTop: 8,
  },
  registerBtnContent: {
    paddingVertical: 6,
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
