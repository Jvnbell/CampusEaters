import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { GlassCard } from '@/components/GlassCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';
import type { RestaurantWithMenuAndRating } from '@/lib/types';

type Sort = 'popular' | 'name' | 'price';

export default function RestaurantsScreen() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<RestaurantWithMenuAndRating[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('popular');

  const load = useCallback(async () => {
    try {
      const data = await api<{ restaurants: RestaurantWithMenuAndRating[] }>(
        '/api/restaurants',
      );
      setRestaurants(data.restaurants);
    } catch (err) {
      console.warn('[restaurants] load failed', err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = restaurants;
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.menuItems.some((m) => m.name.toLowerCase().includes(q)),
      );
    }
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'price') {
        const pa = priceRange(a).min;
        const pb = priceRange(b).min;
        return pa - pb;
      }
      // popular
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return b.reviewCount - a.reviewCount;
    });
  }, [restaurants, search, sort]);

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View>
        <Text className="text-xs uppercase tracking-[3px] text-secondary">Browse</Text>
        <Text className="font-display text-3xl font-semibold text-foreground">Restaurants</Text>
        <Text className="text-sm text-muted-foreground">
          Every kitchen on campus. Tap one to see the menu and reviews.
        </Text>
      </View>

      <View className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 flex-row items-center gap-2">
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, location, or dish"
          placeholderTextColor={colors.mutedForeground}
          className="flex-1 text-base text-foreground"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <View className="flex-row gap-2">
        {(
          [
            { id: 'popular', label: 'Popular' },
            { id: 'name', label: 'A → Z' },
            { id: 'price', label: 'Cheapest' },
          ] as { id: Sort; label: string }[]
        ).map((opt) => {
          const active = sort === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setSort(opt.id)}
              className={`rounded-full px-4 py-1.5 ${
                active ? 'bg-primary/20 border border-primary/40' : 'bg-white/5 border border-white/10'
              }`}
            >
              <Text
                className={`text-xs font-semibold uppercase tracking-wider ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {visible.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try a different search or check back when more kitchens open."
          icon={<Ionicons name="restaurant-outline" size={32} color={colors.mutedForeground} />}
        />
      ) : (
        <View className="gap-3">
          {visible.map((r) => {
            const range = priceRange(r);
            const isPopular = r.averageRating >= 4.5 && r.reviewCount >= 5;
            return (
              <Pressable key={r.id} onPress={() => router.push(`/restaurant/${r.id}`)}>
                <GlassCard className="gap-3">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg font-semibold text-foreground">{r.name}</Text>
                        {isPopular ? (
                          <View className="rounded-full bg-accent/20 px-2 py-0.5">
                            <Text className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                              Popular
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-sm text-muted-foreground">{r.location}</Text>
                    </View>
                    <View className="items-end">
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="star" size={14} color={colors.warning} />
                        <Text className="text-sm font-semibold text-foreground">
                          {r.averageRating.toFixed(1)}
                        </Text>
                      </View>
                      <Text className="text-xs text-muted-foreground">
                        {r.reviewCount} review{r.reviewCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5">
                    {r.menuItems.slice(0, 4).map((m) => (
                      <View
                        key={m.id}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
                      >
                        <Text className="text-[11px] text-foreground/80">{m.name}</Text>
                      </View>
                    ))}
                    {r.menuItems.length > 4 ? (
                      <View className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        <Text className="text-[11px] text-muted-foreground">
                          +{r.menuItems.length - 4}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="flex-row items-center justify-between border-t border-white/10 pt-2">
                    <Text className="text-xs text-muted-foreground">
                      {r.menuItems.length} item{r.menuItems.length === 1 ? '' : 's'}
                    </Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {range.min === range.max
                        ? `$${range.min.toFixed(2)}`
                        : `$${range.min.toFixed(2)} – $${range.max.toFixed(2)}`}
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

function priceRange(r: RestaurantWithMenuAndRating): { min: number; max: number } {
  if (r.menuItems.length === 0) return { min: 0, max: 0 };
  const prices = r.menuItems.map((m) => Number(m.price)).filter((n) => Number.isFinite(n));
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}
