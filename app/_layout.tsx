import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { TripProvider } from '../src/context/TripContext';
import { paperTheme } from '../src/theme/paperTheme';
import { M3Colors } from '../src/theme/colors';

function RootNavigation() {
  const { firebaseUser, loading, needsSetup } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!firebaseUser && !inAuthGroup) {
      // Redirect to login if unauthenticated
      router.replace('/(auth)/login');
    } else if (firebaseUser && inAuthGroup) {
      if (needsSetup) {
        router.replace('/setup-wizard');
      } else {
        router.replace('/(tabs)');
      }
    } else if (firebaseUser && needsSetup && segments[0] !== 'setup-wizard') {
      router.replace('/setup-wizard');
    }
  }, [firebaseUser, loading, needsSetup, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={M3Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="setup-wizard"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="trip/create"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="trip/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="trip/add-expense"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="trip/settle"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="scan-qr"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
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
          <AuthProvider>
            <TripProvider>
              <StatusBar style="dark" backgroundColor={M3Colors.surface} />
              <RootNavigation />
            </TripProvider>
          </AuthProvider>
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
    backgroundColor: M3Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
