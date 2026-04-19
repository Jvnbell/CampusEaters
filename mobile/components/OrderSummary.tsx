import { Text, View } from 'react-native';

import { formatRelative, orderStatusLabel, orderStatusTint } from '@/lib/format';
import type { OrderWithRelations } from '@/lib/types';

import { GlassCard } from './GlassCard';

type Props = {
  order: OrderWithRelations;
  children?: React.ReactNode;
};

/**
 * Compact summary row for an order: restaurant + line-items + status pill.
 * Used in the Orders tab and as a header on the order detail screen.
 */
export function OrderSummary({ order, children }: Props) {
  const subtotal = order.orderItems.reduce(
    (sum, line) => sum + Number(line.menuItem.price) * line.quantity,
    0,
  );

  return (
    <GlassCard className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wider text-muted-foreground">
            Order #{order.orderNumber}
          </Text>
          <Text className="mt-0.5 text-lg font-semibold text-foreground">
            {order.restaurant.name}
          </Text>
          <Text className="text-sm text-muted-foreground">{order.restaurant.location}</Text>
        </View>
        <View className={`rounded-full px-2.5 py-1 ${orderStatusTint(order.status)}`}>
          <Text className="text-[11px] font-semibold uppercase tracking-wider">
            {orderStatusLabel(order.status)}
          </Text>
        </View>
      </View>

      <View className="gap-1">
        {order.orderItems.slice(0, 4).map((line) => (
          <Text key={line.id} className="text-sm text-foreground/85">
            {line.quantity}× {line.menuItem.name}
          </Text>
        ))}
        {order.orderItems.length > 4 ? (
          <Text className="text-sm text-muted-foreground">
            +{order.orderItems.length - 4} more
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between border-t border-white/10 pt-3">
        <Text className="text-xs text-muted-foreground">
          Placed {formatRelative(order.placedAt)} · {order.deliveryLocation}
        </Text>
        <Text className="text-sm font-semibold text-foreground">
          ${subtotal.toFixed(2)}
        </Text>
      </View>

      {children}
    </GlassCard>
  );
}
