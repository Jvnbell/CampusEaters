import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Stars } from '@/components/Stars';
import { api } from '@/lib/api';
import { formatCurrency, formatRelative } from '@/lib/format';
import { colors } from '@/lib/theme';
import type { RestaurantWithMenuAndRating, Review } from '@/lib/types';

type DetailResponse = {
  restaurant: RestaurantWithMenuAndRating;
  reviews: Review[];
};

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const restaurantId = params.id;

  const [data, setData] = useState<DetailResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const res = await api<DetailResponse>(`/api/restaurants/${restaurantId}`);
      setData(res);
    } catch (err) {
      console.warn('[restaurant detail] load failed', err);
    }
  }, [restaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const histogram = useMemo(() => buildHistogram(data?.reviews ?? []), [data?.reviews]);
  const total = histogram.reduce((sum, n) => sum + n, 0);

  if (!data) {
    return (
      <ScreenContainer scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const { restaurant, reviews } = data;

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          hitSlop={10}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10"
        >
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text className="text-xs uppercase tracking-[3px] text-secondary">Restaurant</Text>
      </View>

      <View>
        <Text className="font-display text-3xl font-semibold text-foreground">
          {restaurant.name}
        </Text>
        <Text className="text-sm text-muted-foreground">{restaurant.location}</Text>
      </View>

      <Button
        label="Request a delivery"
        leftIcon={<Ionicons name="rocket" size={18} color="#0a0612" />}
        onPress={() => router.push(`/request-delivery?restaurant=${restaurant.id}`)}
      />

      <GlassCard className="gap-3">
        <View className="flex-row items-end gap-4">
          <View>
            <Text className="font-display text-4xl font-semibold text-foreground">
              {restaurant.averageRating.toFixed(1)}
            </Text>
            <Stars value={restaurant.averageRating} size={16} />
            <Text className="mt-1 text-xs text-muted-foreground">
              {restaurant.reviewCount} review{restaurant.reviewCount === 1 ? '' : 's'}
            </Text>
          </View>
          <View className="flex-1 gap-1.5">
            {[5, 4, 3, 2, 1].map((bucket) => {
              const count = histogram[bucket - 1] ?? 0;
              const pct = total ? count / total : 0;
              return (
                <View key={bucket} className="flex-row items-center gap-2">
                  <Text className="w-3 text-[11px] text-muted-foreground">{bucket}</Text>
                  <View className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <View
                      className="h-full rounded-full bg-warning"
                      style={{ width: `${pct * 100}%` }}
                    />
                  </View>
                  <Text className="w-7 text-right text-[11px] text-muted-foreground">
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </GlassCard>

      <View>
        <Text className="font-display text-xl font-semibold text-foreground">Menu</Text>
        <Text className="text-xs text-muted-foreground">
          {restaurant.menuItems.length} item{restaurant.menuItems.length === 1 ? '' : 's'}
        </Text>
      </View>
      <View className="gap-2">
        {restaurant.menuItems.map((item) => (
          <GlassCard key={item.id} compact>
            <View className="flex-row items-center justify-between">
              <Text className="text-base text-foreground">{item.name}</Text>
              <Text className="text-base font-semibold text-foreground">
                {formatCurrency(item.price)}
              </Text>
            </View>
          </GlassCard>
        ))}
      </View>

      <View>
        <Text className="font-display text-xl font-semibold text-foreground">Recent reviews</Text>
      </View>
      {reviews.length === 0 ? (
        <GlassCard compact>
          <Text className="text-sm text-muted-foreground">
            No reviews yet — be the first after your next delivery.
          </Text>
        </GlassCard>
      ) : (
        reviews.map((r) => (
          <GlassCard key={r.id} compact className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-foreground">
                {r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName.charAt(0)}.` : 'Anonymous'}
              </Text>
              <Stars value={r.rating} size={14} />
            </View>
            {r.comment ? (
              <Text className="text-sm leading-snug text-foreground/85">“{r.comment}”</Text>
            ) : null}
            <Text className="text-[11px] text-muted-foreground">{formatRelative(r.createdAt)}</Text>
          </GlassCard>
        ))
      )}
    </ScreenContainer>
  );
}

function buildHistogram(reviews: Review[]): number[] {
  const buckets = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    const idx = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
    buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  return buckets;
}
