import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, Image, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { TripProvider } from '../src/context/TripContext';
import { ToastProvider } from '../src/context/ToastContext';
import { paperTheme } from '../src/theme/paperTheme';
import { M3Colors } from '../src/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const { firebaseUser, user, loading, needsSetup } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isPublicRoute = segments[0] === 'join-group' || segments[0] === 'scan-qr';
    const isAuthenticated = !!firebaseUser || !!user;

    if (!isAuthenticated && !inAuthGroup && !isPublicRoute) {
      // Redirect to login if unauthenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (needsSetup) {
        router.replace('/setup-wizard');
      } else {
        router.replace('/(tabs)');
      }
    } else if (isAuthenticated && needsSetup && segments[0] !== 'setup-wizard') {
      router.replace('/setup-wizard');
    }
  }, [firebaseUser, user, loading, needsSetup, segments]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.splashContent}>
          <View style={styles.logoCard}>
            <Image
              source={require('../assets/images/app_logo_modern.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.splashTitle}>TripSplit</Text>
          <Text style={styles.splashSubtitle}>Smart Group Expenses & UPI Settlements</Text>
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator size="small" color={M3Colors.primary} />
          </View>
        </View>
        <View style={styles.splashFooter}>
          <Text style={styles.splashFooterText}>v1.0.0 • Fast, Secure & Offline-First</Text>
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        presentation: 'card',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen
        name="join-group"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="setup-wizard"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="trip/create"
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="trip/[id]"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="trip/members"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="trip/add-expense"
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="trip/edit-expense"
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="trip/settle"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="scan-qr"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="my-dashboard"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <ToastProvider>
            <AuthProvider>
              <TripProvider>
                <StatusBar style="dark" />
                <RootNavigation />
              </TripProvider>
            </AuthProvider>
          </ToastProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F3FCF4',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 56,
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoCard: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 24,
  },
  splashLogo: {
    width: 90,
    height: 90,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 28,
  },
  spinnerWrapper: {
    padding: 8,
  },
  splashFooter: {
    alignItems: 'center',
  },
  splashFooterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
});
