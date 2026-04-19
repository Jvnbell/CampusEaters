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

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Name, email and password are required.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords don’t match', 'Re-type the same password.');
      return;
    }
    setSubmitting(true);
    try {
      const { needsConfirmation } = await signUp({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });
      if (needsConfirmation) {
        Alert.alert(
          'Check your inbox',
          'We sent a confirmation link. Open it and you’ll be signed in automatically.',
        );
        router.replace('/(auth)/login');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      Alert.alert('Could not sign up', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View className="items-center gap-2 pt-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-secondary/20">
          <Ionicons name="sparkles" size={26} color={colors.secondary} />
        </View>
        <Text className="font-display text-3xl font-semibold text-foreground">
          Create your account
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          A few details and you’re ready to summon a delivery bot.
        </Text>
      </View>

      <GlassCard className="mt-2 gap-3">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoComplete="given-name"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoComplete="family-name"
            />
          </View>
        </View>
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
          label="Phone (optional)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          autoComplete="tel"
          inputMode="tel"
          placeholder="+1 555 123 4567"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          secureTextEntry
          helper="At least 8 characters."
        />
        <Input
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          autoCapitalize="none"
          secureTextEntry
        />
        <Button label="Create account" onPress={onSubmit} loading={submitting} fullWidth />
      </GlassCard>

      <View className="items-center pt-1">
        <Text className="text-sm text-muted-foreground">
          Already a user?{' '}
          <Link href="/(auth)/login" className="font-semibold text-foreground">
            Sign in
          </Link>
        </Text>
      </View>
    </ScreenContainer>
  );
}
