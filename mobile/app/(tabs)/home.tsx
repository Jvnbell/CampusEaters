import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { orderStatusLabel, orderStatusTint } from '@/lib/format';
import { colors } from '@/lib/theme';
import type { OrderWithRelations, RestaurantWithMenuAndRating } from '@/lib/types';

const ACTIVE_STATUSES = new Set<OrderWithRelations['status']>(['SENT', 'RECEIVED', 'SHIPPING']);

export default function HomeScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();

  const [restaurants, setRestaurants] = useState<RestaurantWithMenuAndRating[]>([]);
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, o] = await Promise.all([
        api<{ restaurants: RestaurantWithMenuAndRating[] }>('/api/restaurants'),
        session?.user?.email
          ? api<{ orders: OrderWithRelations[] }>(
              `/api/orders?email=${encodeURIComponent(session.user.email)}`,
            )
          : Promise.resolve({ orders: [] as OrderWithRelations[] }),
      ]);
      setRestaurants(r.restaurants);
      setOrders(o.orders);
    } catch (err) {
      console.warn('[home] load failed', err);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const activeOrder = useMemo(
    () => orders.find((o) => ACTIVE_STATUSES.has(o.status)) ?? null,
    [orders],
  );

  const featured = useMemo(
    () =>
      [...restaurants]
        .sort((a, b) => {
          if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
          return b.reviewCount - a.reviewCount;
        })
        .slice(0, 3),
    [restaurants],
  );

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View>
        <Text className="text-xs uppercase tracking-[3px] text-secondary">{greeting()}</Text>
        <Text className="font-display text-3xl font-semibold text-foreground">
          {profile?.firstName ? `Hey, ${profile.firstName}` : 'Welcome to CampusEats'}
        </Text>
        <Text className="text-sm text-muted-foreground">
          What can a delivery bot bring you today?
        </Text>
      </View>

      <Button
        label="Request a delivery"
        leftIcon={<Ionicons name="rocket" size={18} color="#0a0612" />}
        onPress={() => router.push('/request-delivery')}
      />

      {activeOrder ? (
        <Pressable onPress={() => router.push('/(tabs)/orders')}>
          <GlassCard className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs uppercase tracking-wider text-muted-foreground">
                Current delivery
              </Text>
              <View className={`rounded-full px-2.5 py-1 ${orderStatusTint(activeOrder.status)}`}>
                <Text className="text-[11px] font-semibold uppercase tracking-wider">
                  {orderStatusLabel(activeOrder.status)}
                </Text>
              </View>
            </View>
            <Text className="text-lg font-semibold text-foreground">
              {activeOrder.restaurant.name}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Heading to {activeOrder.deliveryLocation}
            </Text>
            <Text className="text-sm font-semibold text-secondary">Track in Orders →</Text>
          </GlassCard>
        </Pressable>
      ) : null}

      <View className="flex-row items-end justify-between pt-2">
        <Text className="font-display text-xl font-semibold text-foreground">Top picks</Text>
        <Pressable onPress={() => router.push('/(tabs)/restaurants')}>
          <Text className="text-sm text-secondary">See all</Text>
        </Pressable>
      </View>

      <View className="gap-3">
        {featured.length === 0 ? (
          <GlassCard>
            <Text className="text-sm text-muted-foreground">
              Restaurants will show here once your campus team adds them.
            </Text>
          </GlassCard>
        ) : (
          featured.map((r) => (
            <Pressable key={r.id} onPress={() => router.push(`/restaurant/${r.id}`)}>
              <GlassCard className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-semibold text-foreground">{r.name}</Text>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="star" size={14} color={colors.warning} />
                    <Text className="text-sm font-semibold text-foreground">
                      {r.averageRating.toFixed(1)}
                    </Text>
                    <Text className="text-xs text-muted-foreground">({r.reviewCount})</Text>
                  </View>
                </View>
                <Text className="text-sm text-muted-foreground">{r.location}</Text>
                <Text className="text-xs uppercase tracking-wider text-muted-foreground">
                  {r.menuItems.length} item{r.menuItems.length === 1 ? '' : 's'} on the menu
                </Text>
              </GlassCard>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night cravings';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}
