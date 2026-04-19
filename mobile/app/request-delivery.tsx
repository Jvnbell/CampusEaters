import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/lib/theme';
import type { CartLine, MenuItemSummary, RestaurantWithMenuAndRating } from '@/lib/types';

export default function RequestDeliveryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ restaurant?: string }>();

  const [restaurants, setRestaurants] = useState<RestaurantWithMenuAndRating[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api<{ restaurants: RestaurantWithMenuAndRating[] }>(
          '/api/restaurants',
        );
        if (cancelled) return;
        setRestaurants(data.restaurants);

        const initial = params.restaurant ?? data.restaurants[0]?.id ?? null;
        if (initial && data.restaurants.some((r) => r.id === initial)) {
          setRestaurantId(initial);
        }
      } catch (err) {
        console.warn('[delivery] load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.restaurant]);

  const restaurant = useMemo(
    () => restaurants.find((r) => r.id === restaurantId) ?? null,
    [restaurants, restaurantId],
  );

  // Reset the cart whenever the user switches restaurants — items from one
  // kitchen aren't valid line-items at another.
  const setRestaurant = useCallback((id: string) => {
    setRestaurantId(id);
    setCart({});
  }, []);

  const cartLines: CartLine[] = useMemo(() => {
    if (!restaurant) return [];
    return restaurant.menuItems
      .filter((m) => (cart[m.id] ?? 0) > 0)
      .map((m) => ({ menuItem: m, quantity: cart[m.id] ?? 0 }));
  }, [cart, restaurant]);

  const subtotal = cartLines.reduce(
    (sum, line) => sum + Number(line.menuItem.price) * line.quantity,
    0,
  );

  const updateQty = useCallback((item: MenuItemSummary, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[item.id] ?? 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[item.id];
      else copy[item.id] = next;
      return copy;
    });
  }, []);

  const submit = useCallback(async () => {
    if (!restaurantId) {
      Alert.alert('Pick a restaurant', 'Choose where to order from.');
      return;
    }
    if (!deliveryLocation.trim()) {
      Alert.alert('Where to?', 'Add a drop-off location, e.g. “Library, room 204”.');
      return;
    }
    if (cartLines.length === 0) {
      Alert.alert('Add some food', 'Pick at least one item from the menu.');
      return;
    }
    setSubmitting(true);
    try {
      await api('/api/orders', {
        method: 'POST',
        body: {
          restaurantId,
          deliveryLocation: deliveryLocation.trim(),
          items: cartLines.map((line) => ({
            menuItemId: line.menuItem.id,
            quantity: line.quantity,
          })),
        },
      });
      Alert.alert('Bot is on it', 'Your order was placed. Track it on the Orders tab.', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
            router.push('/(tabs)/orders');
          },
        },
      ]);
    } catch (err) {
      Alert.alert(
        'Could not place order',
        err instanceof Error ? err.message : 'Try again in a moment.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [cartLines, deliveryLocation, restaurantId, router]);

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={{ paddingBottom: 140 }}>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Close"
          hitSlop={10}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10"
        >
          <Ionicons name="close" size={20} color={colors.foreground} />
        </Pressable>
        <Text className="text-xs uppercase tracking-[3px] text-secondary">New delivery</Text>
      </View>

      <Text className="font-display text-3xl font-semibold text-foreground">
        Request a delivery
      </Text>
      <Text className="text-sm text-muted-foreground">
        Choose a restaurant, build your order, and tell us where to send the bot.
      </Text>

      <Text className="text-xs uppercase tracking-wider text-muted-foreground">
        Restaurant
      </Text>
      <View className="gap-2">
        {restaurants.map((r) => {
          const active = r.id === restaurantId;
          return (
            <Pressable key={r.id} onPress={() => setRestaurant(r.id)}>
              <GlassCard
                compact
                className={
                  active
                    ? 'border-primary/60 bg-primary/10'
                    : ''
                }
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-semibold text-foreground">{r.name}</Text>
                    <Text className="text-xs text-muted-foreground">{r.location}</Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={colors.mutedForeground} />
                  )}
                </View>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>

      <Input
        label="Drop-off location"
        value={deliveryLocation}
        onChangeText={setDeliveryLocation}
        placeholder="Library, room 204"
        autoCapitalize="words"
      />

      {restaurant ? (
        <>
          <Text className="text-xs uppercase tracking-wider text-muted-foreground">
            Menu
          </Text>
          <View className="gap-2">
            {restaurant.menuItems.map((item) => {
              const qty = cart[item.id] ?? 0;
              return (
                <GlassCard key={item.id} compact>
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base text-foreground">{item.name}</Text>
                      <Text className="text-sm text-muted-foreground">
                        {formatCurrency(item.price)}
                      </Text>
                    </View>
                    {qty === 0 ? (
                      <Pressable
                        onPress={() => updateQty(item, 1)}
                        className="rounded-full bg-primary/20 border border-primary/40 px-3 py-1.5"
                      >
                        <Text className="text-xs font-semibold uppercase tracking-wider text-primary">
                          Add
                        </Text>
                      </Pressable>
                    ) : (
                      <View className="flex-row items-center gap-2 rounded-full bg-white/5 border border-white/10 px-1 py-1">
                        <Pressable
                          hitSlop={10}
                          onPress={() => updateQty(item, -1)}
                          className="h-7 w-7 items-center justify-center"
                        >
                          <Ionicons name="remove" size={16} color={colors.foreground} />
                        </Pressable>
                        <Text className="w-5 text-center text-sm font-semibold text-foreground">
                          {qty}
                        </Text>
                        <Pressable
                          hitSlop={10}
                          onPress={() => updateQty(item, 1)}
                          className="h-7 w-7 items-center justify-center"
                        >
                          <Ionicons name="add" size={16} color={colors.foreground} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </GlassCard>
              );
            })}
          </View>
        </>
      ) : null}

      <GlassCard className="gap-2">
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">Summary</Text>
        {cartLines.length === 0 ? (
          <Text className="text-sm text-muted-foreground">Nothing in the cart yet.</Text>
        ) : (
          cartLines.map((line) => (
            <View key={line.menuItem.id} className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground">
                {line.quantity}× {line.menuItem.name}
              </Text>
              <Text className="text-sm text-foreground">
                {formatCurrency(Number(line.menuItem.price) * line.quantity)}
              </Text>
            </View>
          ))
        )}
        <View className="border-t border-white/10 pt-2 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-foreground">Subtotal</Text>
          <Text className="text-base font-semibold text-foreground">
            {formatCurrency(subtotal)}
          </Text>
        </View>
      </GlassCard>

      <Button
        label="Send the bot"
        onPress={submit}
        loading={submitting}
        leftIcon={<Ionicons name="rocket" size={18} color="#0a0612" />}
      />
    </ScreenContainer>
  );
}
