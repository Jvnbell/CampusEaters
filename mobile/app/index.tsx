import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';

/**
 * Boot route: blocks for the initial Supabase session check, then sends the
 * user to the right surface. Keeps the login/tab decisions in one place so
 * downstream screens never have to think about it.
 */
export default function Index() {
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return session ? <Redirect href="/(tabs)/home" /> : <Redirect href="/(auth)/login" />;
}
