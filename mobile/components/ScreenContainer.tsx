import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auroraGradient, colors } from '@/lib/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** Hide the aurora background — useful when a screen has its own hero. */
  hideAurora?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
};

/**
 * Standard chrome for every screen: aurora gradient background, safe-area
 * padding, and an optional ScrollView. Mirrors the marketing/page wrapper on
 * the website.
 */
export function ScreenContainer({
  children,
  scroll = true,
  hideAurora = false,
  contentContainerStyle,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <View className="flex-1 bg-background">
      {!hideAurora ? (
        <LinearGradient
          colors={auroraGradient}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 },
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={!!refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}
