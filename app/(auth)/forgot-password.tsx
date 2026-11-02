import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { safeGoBack } from '../../src/utils/navigation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your account email.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      console.warn('Password reset error:', err);
      let msg = 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address.';
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
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(auth)/login')}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={M3Colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.brandContainer}>
          <Text style={styles.appTitle}>Reset Password</Text>
          <Text style={styles.tagline}>
            Enter your email and we'll send you instructions to reset your password.
          </Text>
        </View>

        <View style={styles.card}>
          {sent ? (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={24} color={M3Colors.primary} />
              <View style={styles.successTextContainer}>
                <Text style={styles.successTitle}>Reset Email Sent!</Text>
                <Text style={styles.successBody}>
                  Check your inbox at {email} for the link to reset your password.
                </Text>
              </View>
            </View>
          ) : (
            <>
              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color={M3Colors.onErrorContainer} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <TextInput
                label="Email Address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMsg) setErrorMsg('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                style={styles.input}
                outlineColor={M3Colors.outlineVariant}
                activeOutlineColor={M3Colors.primary}
                left={<TextInput.Icon icon="email-outline" />}
              />

              <Button
                mode="contained"
                onPress={handleReset}
                loading={loading}
                disabled={loading}
                style={styles.resetBtn}
                contentStyle={styles.resetBtnContent}
                buttonColor={M3Colors.primary}
              >
                Send Reset Link
              </Button>
            </>
          )}

          <Button
            mode="text"
            onPress={() => router.push('/(auth)/login')}
            textColor={M3Colors.primary}
            style={styles.backToLoginBtn}
          >
            Back to Login
          </Button>
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
    justifyContent: 'center',
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
    marginBottom: M3Shapes.spacing.xl,
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
  successBanner: {
    flexDirection: 'row',
    backgroundColor: M3Colors.primaryContainer,
    padding: 14,
    borderRadius: M3Shapes.cardMedium,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  successBody: {
    ...M3Typography.bodySm,
    color: M3Colors.onPrimaryContainer,
    marginTop: 2,
  },
  input: {
    marginBottom: 16,
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  resetBtn: {
    borderRadius: M3Shapes.pill,
  },
  resetBtnContent: {
    paddingVertical: 6,
  },
  backToLoginBtn: {
    marginTop: 12,
  },
});
