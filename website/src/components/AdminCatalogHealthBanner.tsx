'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type CatalogHealth = {
  menuItemCount: number;
  restaurantCount: number;
  hasMenuCatalog: boolean;
};

/**
 * Fetches admin-only catalog stats. Non-admins get 403 — the component renders nothing.
 */
export function AdminCatalogHealthBanner() {
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/admin/catalog-health', { cache: 'no-store' });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as CatalogHealth;
        if (typeof data.menuItemCount !== 'number') return;
        if (data.menuItemCount === 0) {
          setWarning(
            data.restaurantCount === 0
              ? 'There are no restaurants and no menu items in the database. Run the seed script from the website directory: npx prisma db seed'
              : 'Menu items are missing (0 in the database). Run: npx prisma db seed — or restore menu rows for your existing restaurants.',
          );
        }
      } catch {
        // ignore network errors; banner is non-critical
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!warning) return null;

  return (
    <Alert
      variant="destructive"
      className="mb-6 border-amber-500/40 bg-amber-950/40 text-amber-50 [&>svg]:text-amber-400"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Catalog not seeded</AlertTitle>
      <AlertDescription className="text-amber-100/90">{warning}</AlertDescription>
    </Alert>
  );
}
