'use client';

import { useCurrentProfile } from '@/hooks/use-current-profile';

import { AdminCatalogHealthBanner } from '@/components/AdminCatalogHealthBanner';

/** Renders the catalog health banner only for admin profiles (avoids an extra API call for other users). */
export function AdminCatalogHealthBannerGate() {
  const { profile, isLoading } = useCurrentProfile();
  if (isLoading || profile?.role !== 'ADMIN') return null;
  return <AdminCatalogHealthBanner />;
}
