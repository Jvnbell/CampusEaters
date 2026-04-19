import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

/**
 * Auth stack: bounces the user back to the tabs the moment a session exists,
 * so a deep-link to /(auth)/login won't strand a logged-in user.
 */
export default function AuthLayout() {
  const { session, initializing } = useAuth();
  if (!initializing && session) {
    return <Redirect href="/(tabs)/home" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
