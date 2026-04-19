import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // We crash early so a missing .env doesn't surface as a confusing 401 on
  // first sign-in. Easier to debug a hard error at boot.
  throw new Error(
    'Missing Supabase env. Copy mobile/.env.example to mobile/.env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // React Native opens links via deep-linking, not URL hash like the web,
    // so we keep this disabled to avoid double-handling magic-link callbacks.
    detectSessionInUrl: false,
  },
});

// Tell Supabase to pause/resume its token refresh timer with the app's
// foreground/background state. Without this, refresh can fire while the app
// is suspended and silently fail.
let appStateSubscription: { remove: () => void } | null = null;

export function attachSupabaseAppStateListener() {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
