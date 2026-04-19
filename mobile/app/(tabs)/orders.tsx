import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { OrderReviewCard } from '@/components/OrderReviewCard';
import { OrderSummary } from '@/components/OrderSummary';
import { ScreenContainer } from '@/components/ScreenContainer';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';
import type { OrderWithRelations } from '@/lib/types';

const ACTIVE_STATUSES = new Set<OrderWithRelations['status']>(['SENT', 'RECEIVED', 'SHIPPING']);

const TIMELINE: Array<{ key: OrderWithRelations['status']; label: string }> = [
  { key: 'SENT', label: 'Order placed' },
  { key: 'RECEIVED', label: 'Restaurant received' },
  { key: 'SHIPPING', label: 'Bot is on the way' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const load = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const data = await api<{ orders: OrderWithRelations[] }>(
        `/api/orders?email=${encodeURIComponent(session.user.email)}`,
      );
      setOrders(data.orders);
    } catch (err) {
      console.warn('[orders] load failed', err);
    }
  }, [session?.user?.email]);

  // useFocusEffect refetches when the tab is re-entered (e.g. after placing
  // an order) without needing manual events.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const active = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const history = orders.filter((o) => !ACTIVE_STATUSES.has(o.status));
  const list = tab === 'active' ? active : history;

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View>
        <Text className="text-xs uppercase tracking-[3px] text-secondary">Track</Text>
        <Text className="font-display text-3xl font-semibold text-foreground">Your orders</Text>
        <Text className="text-sm text-muted-foreground">
          Live status, past deliveries, and ratings — all in one place.
        </Text>
      </View>

      <View className="flex-row rounded-2xl border border-white/10 bg-white/5 p-1">
        {(
          [
            { id: 'active', label: `Active (${active.length})` },
            { id: 'history', label: `History (${history.length})` },
          ] as const
        ).map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => setTab(opt.id)}
            className={`flex-1 rounded-xl py-2 ${
              tab === opt.id ? 'bg-primary/20' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                tab === opt.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {list.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'No active deliveries' : 'No past orders yet'}
          description={
            tab === 'active'
              ? 'Order something and the bot route shows up here in real time.'
              : 'Once a delivery completes, it shows up here so you can rate it.'
          }
          icon={<Ionicons name="receipt-outline" size={32} color={colors.mutedForeground} />}
          action={
            tab === 'active' ? (
              <Button label="Request a delivery" onPress={() => router.push('/request-delivery')} />
            ) : undefined
          }
        />
      ) : (
        list.map((order) => (
          <OrderSummary key={order.id} order={order}>
            {tab === 'active' ? (
              <Timeline status={order.status} />
            ) : (
              <View className="pt-1">
                <OrderReviewCard orderNumber={order.orderNumber} />
              </View>
            )}
          </OrderSummary>
        ))
      )}
    </ScreenContainer>
  );
}

function Timeline({ status }: { status: OrderWithRelations['status'] }) {
  const idx = TIMELINE.findIndex((s) => s.key === status);
  return (
    <View className="gap-2 border-t border-white/10 pt-3">
      {TIMELINE.map((step, i) => {
        const reached = i <= idx;
        const isCurrent = i === idx;
        return (
          <View key={step.key} className="flex-row items-center gap-3">
            <View
              className={`h-2.5 w-2.5 rounded-full ${
                reached ? 'bg-primary' : 'bg-white/15'
              } ${isCurrent ? 'border-2 border-primary/40' : ''}`}
            />
            <Text
              className={`text-sm ${
                reached ? 'font-semibold text-foreground' : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
