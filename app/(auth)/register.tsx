import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import LoginScreen from './login';

export default function RegisterScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(auth)/login?mode=signup');
  }, [router]);

  return <LoginScreen />;
}
