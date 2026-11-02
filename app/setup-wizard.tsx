import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { TextInput, Button, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { M3Colors } from '../src/theme/colors';
import { M3Typography } from '../src/theme/typography';
import { M3Shapes } from '../src/theme/shapes';
import { SUPPORTED_CURRENCIES } from '../src/services/currency/exchangeRateService';
import { isValidUpiId } from '../src/services/upi/upiParser';

export default function SetupWizardScreen() {
  const router = useRouter();
  const { user, completeSetup } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [country, setCountry] = useState(user?.country || 'India');
  const [currency, setCurrency] = useState(user?.defaultCurrency || 'INR');
  const [language, setLanguage] = useState(user?.preferredLanguage || 'English');
  const [upiId, setUpiId] = useState(user?.upiId || '');

  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setPhotoUrl(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleComplete = async () => {
    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    if (upiId.trim() && !isValidUpiId(upiId.trim())) {
      setErrorMsg('Please enter a valid UPI ID (e.g. name@okhdfcbank).');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await completeSetup({
        fullName: fullName.trim(),
        photoUrl: photoUrl || undefined,
        country: country.trim(),
        defaultCurrency: currency,
        preferredLanguage: language,
        upiId: upiId.trim() || undefined,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      console.warn('Setup wizard error:', err);
      setErrorMsg(err.message || 'Failed to complete setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>First Time Setup</Text>
        </View>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Set up your profile preferences and UPI ID for seamless group settlements.
        </Text>
      </View>

      {/* Avatar Picker */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickImage} style={styles.avatarBtn} activeOpacity={0.8}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="camera-plus" size={36} color={M3Colors.primary} />
            </View>
          )}
          <View style={styles.editIconBadge}>
            <MaterialCommunityIcons name="pencil" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to upload photo</Text>
      </View>

      {/* Form Fields Card */}
      <View style={styles.card}>
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={M3Colors.onErrorContainer} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <TextInput
          label="Full Name *"
          value={fullName}
          onChangeText={(t) => {
            setFullName(t);
            if (errorMsg) setErrorMsg('');
          }}
          mode="outlined"
          style={styles.input}
          outlineColor={M3Colors.outlineVariant}
          activeOutlineColor={M3Colors.primary}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Country"
          value={country}
          onChangeText={setCountry}
          mode="outlined"
          style={styles.input}
          outlineColor={M3Colors.outlineVariant}
          activeOutlineColor={M3Colors.primary}
          left={<TextInput.Icon icon="earth" />}
        />

        {/* Currency Selector */}
        <Menu
          visible={currencyMenuVisible}
          onDismiss={() => setCurrencyMenuVisible(false)}
          anchor={
            <TouchableOpacity
              onPress={() => setCurrencyMenuVisible(true)}
              style={styles.selectorBtn}
            >
              <View style={styles.selectorLeft}>
                <MaterialCommunityIcons name="currency-usd" size={20} color={M3Colors.onSurfaceVariant} />
                <View>
                  <Text style={styles.selectorLabel}>Default Base Currency</Text>
                  <Text style={styles.selectorValue}>
                    {SUPPORTED_CURRENCIES[currency]?.flag} {currency} - {SUPPORTED_CURRENCIES[currency]?.name}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={24} color={M3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          }
        >
          {Object.values(SUPPORTED_CURRENCIES).map((c) => (
            <Menu.Item
              key={c.code}
              onPress={() => {
                setCurrency(c.code);
                setCurrencyMenuVisible(false);
              }}
              title={`${c.flag} ${c.code} - ${c.name} (${c.symbol})`}
            />
          ))}
        </Menu>

        {/* UPI ID Section */}
        <View style={styles.upiContainer}>
          <Text style={styles.upiHeading}>UPI ID for Settlements</Text>
          <Text style={styles.upiSubtitle}>
            When group members owe you money, their payments will be sent to this UPI address.
          </Text>

          <View style={styles.upiInputRow}>
            <TextInput
              label="UPI ID (optional)"
              placeholder="e.g. name@okhdfcbank"
              value={upiId}
              onChangeText={(t) => {
                setUpiId(t);
                if (errorMsg) setErrorMsg('');
              }}
              mode="outlined"
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              outlineColor={M3Colors.outlineVariant}
              activeOutlineColor={M3Colors.primary}
              left={<TextInput.Icon icon="qrcode" />}
            />
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/scan-qr', params: { returnTarget: 'wizard' } })}
              style={styles.scanBtn}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={22} color={M3Colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleComplete}
          loading={loading}
          disabled={loading}
          style={styles.completeBtn}
          contentStyle={styles.completeBtnContent}
          buttonColor={M3Colors.primary}
        >
          Get Started
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: M3Colors.surface,
  },
  scrollContent: {
    padding: M3Shapes.spacing.lg,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepBadge: {
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: M3Shapes.pill,
    marginBottom: 8,
  },
  stepText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  title: {
    ...M3Typography.headlineMd,
    color: M3Colors.onSurface,
    fontWeight: '800',
  },
  subtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarBtn: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: M3Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: M3Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: M3Colors.surface,
  },
  avatarHint: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 6,
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
    gap: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.errorContainer,
    padding: 10,
    borderRadius: M3Shapes.cardSmall,
    gap: 8,
  },
  errorText: {
    ...M3Typography.bodySm,
    color: M3Colors.onErrorContainer,
    flex: 1,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: M3Shapes.cardSmall,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
  },
  selectorValue: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
  upiContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
  },
  upiHeading: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  upiSubtitle: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: 10,
  },
  upiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanBtn: {
    width: 50,
    height: 50,
    borderRadius: M3Shapes.cardSmall,
    backgroundColor: M3Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtn: {
    borderRadius: M3Shapes.pill,
    marginTop: 12,
  },
  completeBtnContent: {
    paddingVertical: 6,
  },
});
