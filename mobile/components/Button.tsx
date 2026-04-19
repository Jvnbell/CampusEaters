import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { buttonGradient } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Aurora-styled pressable that mirrors the site's primary CTA. Primary uses
 * the violet→cyan gradient (matches `.btn-aurora` on web); other variants
 * fall back to flat surfaces so they don't compete visually.
 */
export function Button({
  label,
  variant = 'primary',
  loading,
  fullWidth,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        style={({ pressed }) => [
          {
            opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
          },
          fullWidth ? { alignSelf: 'stretch' } : null,
          style,
        ]}
        {...rest}
      >
        <LinearGradient
          colors={buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 22,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? <ActivityIndicator color="#0a0612" /> : leftIcon}
          <Text className="text-base font-semibold tracking-wide text-primary-foreground">
            {label}
          </Text>
          {!loading && rightIcon}
        </LinearGradient>
      </Pressable>
    );
  }

  const surface =
    variant === 'destructive'
      ? 'bg-destructive/15 border border-destructive/40'
      : variant === 'ghost'
        ? 'bg-white/5 border border-white/10'
        : 'bg-white/10 border border-white/15';

  const textColor =
    variant === 'destructive' ? 'text-destructive' : 'text-foreground';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        },
        fullWidth ? { alignSelf: 'stretch' } : null,
        style,
      ]}
      {...rest}
    >
      <View
        className={`flex-row items-center justify-center gap-2 rounded-2xl px-5 py-3.5 ${surface}`}
      >
        {loading ? <ActivityIndicator color="#fff" /> : leftIcon}
        <Text className={`text-base font-semibold ${textColor}`}>{label}</Text>
        {!loading && rightIcon}
      </View>
    </Pressable>
  );
}
