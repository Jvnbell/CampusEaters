import { forwardRef } from 'react';
import { TextInput, View, Text, type TextInputProps } from 'react-native';

import { colors } from '@/lib/theme';

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  helper?: string;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, helper, style, ...rest },
  ref,
) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        className={`rounded-2xl border bg-white/5 px-4 py-3.5 text-base text-foreground ${
          error ? 'border-destructive/60' : 'border-white/10'
        }`}
        style={style}
        {...rest}
      />
      {error ? (
        <Text className="text-xs text-destructive">{error}</Text>
      ) : helper ? (
        <Text className="text-xs text-muted-foreground">{helper}</Text>
      ) : null}
    </View>
  );
});
