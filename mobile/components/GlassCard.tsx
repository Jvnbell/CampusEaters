import { View, type ViewProps } from 'react-native';

type Props = ViewProps & {
  /** Tighter padding for cards inside lists. */
  compact?: boolean;
};

/**
 * Glassmorphism panel matching `.glass-panel` on the web. Uses a translucent
 * surface + thin border + soft shadow so it floats above the aurora gradient.
 */
export function GlassCard({ compact, className, style, children, ...rest }: Props) {
  return (
    <View
      className={`rounded-3xl border border-white/10 bg-white/[0.04] ${
        compact ? 'p-4' : 'p-5'
      } ${className ?? ''}`}
      style={[
        {
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 6,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
