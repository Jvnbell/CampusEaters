import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';

export default function AccountScreen() {
  const { profile, session, signOut } = useAuth();

  const onSignOut = () => {
    Alert.alert('Sign out?', 'You can always sign back in with your email.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            Alert.alert('Hmm', err instanceof Error ? err.message : 'Could not sign out.');
          }
        },
      },
    ]);
  };

  const fullName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : session?.user?.email ?? 'Your account';

  return (
    <ScreenContainer contentContainerStyle={{ paddingBottom: 120 }}>
      <View>
        <Text className="text-xs uppercase tracking-[3px] text-secondary">Account</Text>
        <Text className="font-display text-3xl font-semibold text-foreground">
          {fullName}
        </Text>
        <Text className="text-sm text-muted-foreground">{session?.user?.email}</Text>
      </View>

      <GlassCard className="gap-4">
        <Row icon="person-outline" label="Name" value={fullName} />
        <Row icon="mail-outline" label="Email" value={session?.user?.email ?? '—'} />
        <Row
          icon="call-outline"
          label="Phone"
          value={profile?.phoneNumber ?? 'Not set'}
        />
        <Row icon="shield-checkmark-outline" label="Role" value={profile?.role ?? 'USER'} />
      </GlassCard>

      <GlassCard className="gap-3">
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">Help</Text>
        <Pressable
          onPress={() => Linking.openURL('mailto:hello@campuseats.app?subject=Help%20with%20CampusEats')}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="chatbubbles-outline" size={20} color={colors.foreground} />
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">Contact support</Text>
              <Text className="text-xs text-muted-foreground">
                Email our human team — usually responds within an hour.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </View>
        </Pressable>
        <View className="h-px bg-white/10" />
        <Pressable onPress={() => Linking.openURL('https://campuseats.app/help')}>
          <View className="flex-row items-center gap-3">
            <Ionicons name="book-outline" size={20} color={colors.foreground} />
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">Help center</Text>
              <Text className="text-xs text-muted-foreground">
                Refunds, delivery zones, account stuff.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </View>
        </Pressable>
      </GlassCard>

      <Button
        label="Sign out"
        variant="destructive"
        leftIcon={<Ionicons name="log-out-outline" size={18} color={colors.destructive} />}
        onPress={onSignOut}
        fullWidth
      />

      <Text className="pt-4 text-center text-[11px] text-muted-foreground">
        CampusEats · v0.1
      </Text>
    </ScreenContainer>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/5">
        <Ionicons name={icon} size={18} color={colors.foreground} />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Text>
        <Text className="text-base text-foreground">{value}</Text>
      </View>
    </View>
  );
}
