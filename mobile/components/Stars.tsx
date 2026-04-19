import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = {
  value: number;
  size?: number;
  onChange?: (next: number) => void;
  /** Render as 5 read-only stars when no onChange is supplied. */
  max?: number;
};

export function Stars({ value, size = 18, onChange, max = 5 }: Props) {
  const interactive = typeof onChange === 'function';
  return (
    <View className="flex-row items-center gap-1">
      {Array.from({ length: max }, (_, idx) => {
        const filled = idx < Math.round(value);
        const star = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? colors.warning : colors.mutedForeground}
          />
        );
        if (!interactive) return <View key={idx}>{star}</View>;
        return (
          <Pressable
            key={idx}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${idx + 1} stars`}
            hitSlop={6}
            onPress={() => onChange?.(idx + 1)}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}
