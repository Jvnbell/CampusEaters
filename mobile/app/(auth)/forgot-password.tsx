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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter the email on your account.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      Alert.alert(
        'Reset link sent',
        'Check your inbox for a link to set a new password.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (err) {
      Alert.alert('Could not send link', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View className="items-center gap-2 pt-6">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent/20">
          <Ionicons name="lock-closed" size={26} color={colors.accent} />
        </View>
        <Text className="font-display text-3xl font-semibold text-foreground">
          Reset password
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          We’ll email you a secure link to set a new password.
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
        <Button label="Send reset link" onPress={onSubmit} loading={submitting} fullWidth />
      </GlassCard>

      <View className="items-center pt-1">
        <Link href="/(auth)/login" className="text-sm text-secondary">
          Back to sign in
        </Link>
      </View>
    </ScreenContainer>
  );
}
