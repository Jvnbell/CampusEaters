import type { ReactNode } from 'react';
import { View, Text } from 'react-native';

import { GlassCard } from './GlassCard';

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, action }: Props) {
  return (
    <GlassCard className="items-center gap-3 py-10">
      {icon ? <View className="opacity-80">{icon}</View> : null}
      <Text className="text-center text-lg font-semibold text-foreground">{title}</Text>
      {description ? (
        <Text className="px-2 text-center text-sm leading-snug text-muted-foreground">
          {description}
        </Text>
      ) : null}
      {action ? <View className="pt-2">{action}</View> : null}
    </GlassCard>
  );
}
