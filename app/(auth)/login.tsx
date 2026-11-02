import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Navigation is automatically handled by AuthContext state change in RootNavigation
    } catch (err: any) {
      console.warn('Login error:', err);
      let msg = 'Failed to sign in. Please verify your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your internet connection.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    const demoEmail = 'demo@tripsplit.app';
    const demoPass = 'TripSplitDemo2026!';
    try {
      await signIn(demoEmail, demoPass);
    } catch (err: any) {
      console.warn('Demo login error:', err);
      setErrorMsg(err.message || 'Demo login failed');
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24), paddingBottom: 60 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="wallet-travel" size={40} color={M3Colors.onPrimary} />
          </View>
          <Text style={styles.appTitle}>TripSplit</Text>
          <Text style={styles.tagline}>
            Split group expenses & settle instantly with smart UPI
          </Text>
        </View>

        {/* Entry 3-Way Choice Bar */}
        <View style={styles.entryOptionsRow}>
          <View style={[styles.entryChoiceBtn, styles.entryChoiceBtnActive]}>
            <MaterialCommunityIcons name="login" size={16} color={M3Colors.onPrimary} />
            <Text style={styles.entryChoiceTextActive}>Login</Text>
          </View>

          <TouchableOpacity
            style={styles.entryChoiceBtn}
            onPress={() => router.push('/(auth)/register')}
          >
            <MaterialCommunityIcons name="account-plus" size={16} color={M3Colors.onSurfaceVariant} />
            <Text style={styles.entryChoiceText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.entryChoiceBtn, styles.entryChoiceBtnHighlight]}
            onPress={() => router.push('/join-group')}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={16} color={M3Colors.primary} />
            <Text style={styles.entryChoiceTextHighlight}>Join a Group</Text>
          </TouchableOpacity>
        </View>

        {/* Join a Group Direct Card Banner */}
        <TouchableOpacity
          style={styles.joinGroupBanner}
          onPress={() => router.push('/join-group')}
          activeOpacity={0.85}
        >
          <View style={styles.joinGroupIconBox}>
            <MaterialCommunityIcons name="qrcode-scan" size={22} color={M3Colors.onPrimary} />
          </View>
          <View style={styles.joinGroupTextCol}>
            <Text style={styles.joinGroupTitle}>Have a Group QR or Invite Code?</Text>
            <Text style={styles.joinGroupSubtitle}>
              Join an existing trip without creating an account first
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={M3Colors.primary} />
        </TouchableOpacity>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

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

          <TextInput
            label="Password"
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
    justifyContent: 'center',
    padding: M3Shapes.spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: M3Shapes.spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
    paddingHorizontal: 24,
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
    marginBottom: 16,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
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
    marginVertical: 16,
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
  entryOptionsRow: {
    flexDirection: 'row',
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.pill,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  entryChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: M3Shapes.pill,
    gap: 4,
  },
  entryChoiceBtnActive: {
    backgroundColor: M3Colors.primary,
  },
  entryChoiceTextActive: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  entryChoiceText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  entryChoiceBtnHighlight: {
    backgroundColor: M3Colors.primaryContainer,
  },
  entryChoiceTextHighlight: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '800',
  },
  joinGroupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderRadius: M3Shapes.cardMedium,
    padding: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: M3Colors.primaryFixed,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  joinGroupIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinGroupTextCol: {
    flex: 1,
  },
  joinGroupTitle: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '800',
  },
  joinGroupSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
});
