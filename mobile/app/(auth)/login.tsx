import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Almost there', 'Email and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // The (tabs) layout takes over via the index gate.
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert('Sign-in failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View className="items-center gap-2 pt-6">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
          <Ionicons name="rocket" size={28} color={colors.primary} />
        </View>
        <Text className="font-display text-3xl font-semibold text-foreground">
          Welcome back
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          Sign in with your campus email to keep ordering.
        </Text>
      </View>

      <GlassCard className="mt-4 gap-4">
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          inputMode="email"
          placeholder="you@university.edu"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="password"
          secureTextEntry
          placeholder="••••••••"
        />
        <Button label="Sign in" onPress={onSubmit} loading={submitting} fullWidth />
      </GlassCard>

      <View className="mt-1 items-center gap-2">
        <Link href="/(auth)/forgot-password" className="text-sm text-secondary">
          Forgot password?
        </Link>
        <Text className="text-sm text-muted-foreground">
          New here?{' '}
          <Link href="/(auth)/signup" className="font-semibold text-foreground">
            Create an account
          </Link>
        </Text>
      </View>
    </ScreenContainer>
  );
}
