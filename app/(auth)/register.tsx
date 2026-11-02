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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim());
      // Navigation handled by AuthContext state listener to /setup-wizard
    } catch (err: any) {
      console.warn('Registration error:', err);
      let msg = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use a stronger password.';
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
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

          <TextInput
            label="Full Name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (errorMsg) setErrorMsg('');
            }}
            mode="outlined"
            style={styles.input}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            left={<TextInput.Icon icon="account-outline" />}
          />

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

          <TextInput
            label="Password (min 6 characters)"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMsg) setErrorMsg('');
            }}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errorMsg) setErrorMsg('');
            }}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            left={<TextInput.Icon icon="lock-check-outline" />}
          />

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
  input: {
    marginBottom: 12,
    backgroundColor: M3Colors.surfaceContainerLowest,
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
