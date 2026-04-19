'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { RestaurantWithMenuAndRating } from '@/types/db';

type SortKey = 'rating' | 'name' | 'price-asc' | 'price-desc' | 'menu';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'A → Z' },
  { value: 'price-asc', label: 'Lowest price first' },
  { value: 'price-desc', label: 'Highest price first' },
  { value: 'menu', label: 'Largest menu' },
];

const formatRating = (value: number) => (value > 0 ? value.toFixed(1) : '—');

const computePriceRange = (
  restaurant: RestaurantWithMenuAndRating,
): { min: number; max: number; avg: number } | null => {
  if (restaurant.menuItems.length === 0) return null;
  const prices = restaurant.menuItems
    .map((item) => Number(item.price))
    .filter((p) => Number.isFinite(p));
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  return { min, max, avg };
};

export default function RestaurantsBrowsePage() {
  const [restaurants, setRestaurants] = useState<RestaurantWithMenuAndRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('rating');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch('/api/restaurants', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load restaurants');
        }
        const data = (await response.json()) as { restaurants: RestaurantWithMenuAndRating[] };
        if (mounted) setRestaurants(data.restaurants);
      } catch (err) {
        console.error('[RestaurantsBrowsePage] load failed', err);
        toast.error('Unable to load restaurants. Please try again.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matched = restaurants.filter((r) => {
      if (!needle) return true;
      if (r.name.toLowerCase().includes(needle)) return true;
      if (r.location.toLowerCase().includes(needle)) return true;
      return r.menuItems.some((item) => item.name.toLowerCase().includes(needle));
    });

    const sorted = [...matched];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'menu':
          return b.menuItems.length - a.menuItems.length;
        case 'price-asc': {
          const aRange = computePriceRange(a);
          const bRange = computePriceRange(b);
          return (aRange?.min ?? Infinity) - (bRange?.min ?? Infinity);
        }
        case 'price-desc': {
          const aRange = computePriceRange(a);
          const bRange = computePriceRange(b);
          return (bRange?.max ?? -Infinity) - (aRange?.max ?? -Infinity);
        }
        case 'rating':
        default: {
          // Tie-break by review count, then by name.
          if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return a.name.localeCompare(b.name);
        }
      }
    });
    return sorted;
  }, [restaurants, search, sort]);

  const stats = useMemo(() => {
    const totalMenuItems = restaurants.reduce((sum, r) => sum + r.menuItems.length, 0);
    const rated = restaurants.filter((r) => r.reviewCount > 0);
    const avgRating =
      rated.length > 0 ? rated.reduce((sum, r) => sum + r.averageRating, 0) / rated.length : 0;
    return {
      restaurantCount: restaurants.length,
      itemCount: totalMenuItems,
      avgRating,
    };
  }, [restaurants]);

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[460px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-15 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
        >
          <Link href="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>

      <main className="container mx-auto px-4 pb-20 pt-6">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="space-y-4 text-center">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Campus restaurants
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
              Discover what&apos;s on the menu <span className="gradient-text">tonight</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
              Browse every restaurant on the autonomous fleet, peek at their menus, and request a
              delivery to your dorm or study spot in two taps.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatChip label="Restaurants" value={stats.restaurantCount.toString()} />
            <StatChip label="Menu items" value={stats.itemCount.toString()} />
            <StatChip
              label="Average rating"
              value={stats.avgRating > 0 ? stats.avgRating.toFixed(2) : '—'}
              suffix={stats.avgRating > 0 ? '/ 5' : undefined}
            />
          </div>

          <div className="glass-panel-strong flex flex-col gap-4 p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurants, menu items, or buildings..."
                className="h-12 pl-11 text-base"
              />
            </div>
            <div className="flex items-center gap-2 md:min-w-[260px]">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-12 flex-1 rounded-xl border-white/10 bg-white/[0.04] text-foreground">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="glass-panel-strong border-0">
              <CardHeader className="text-center">
                <CardTitle>No restaurants matched.</CardTitle>
                <CardDescription>
                  Try clearing your search or pick a different sort. From the website folder, run{' '}
                  <code className="rounded bg-white/[0.06] px-1 py-0.5 text-xs">
                    npm run db:seed
                  </code>{' '}
                  to load demo restaurants.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const StatChip = ({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) => (
  <div className="glass-panel flex items-center justify-between p-4">
    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">{label}</p>
    <p className="font-display text-2xl font-semibold text-foreground">
      {value}
      {suffix ? <span className="ml-1 text-sm text-muted-foreground">{suffix}</span> : null}
    </p>
  </div>
);

const RestaurantCard = ({ restaurant }: { restaurant: RestaurantWithMenuAndRating }) => {
  const range = computePriceRange(restaurant);
  const popular = restaurant.menuItems.slice(0, 3);

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-white/10 bg-card/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow">
      <div className="relative h-28 overflow-hidden bg-gradient-aurora">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay [background:radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.6),transparent_60%)]" />
        <div className="absolute inset-0 flex items-end justify-between p-4">
          <span className="font-display text-2xl font-semibold uppercase tracking-tight text-background/90 drop-shadow">
            {restaurant.name.slice(0, 16)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-background/30 px-3 py-1 text-xs font-semibold text-background backdrop-blur-md">
            <Star className="h-3.5 w-3.5 fill-background text-background" strokeWidth={0} />
            {formatRating(restaurant.averageRating)}
          </span>
        </div>
      </div>

      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">{restaurant.name}</CardTitle>
        <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {restaurant.location}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-muted-foreground">
            <UtensilsCrossed className="mr-1 h-3 w-3" />
            {restaurant.menuItems.length} items
          </Badge>
          {range ? (
            <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-muted-foreground">
              ${range.min.toFixed(2)} – ${range.max.toFixed(2)}
            </Badge>
          ) : null}
          <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-muted-foreground">
            {restaurant.reviewCount} review{restaurant.reviewCount === 1 ? '' : 's'}
          </Badge>
        </div>

        {popular.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
              Popular picks
            </p>
            <ul className="space-y-1.5">
              {popular.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm text-foreground/90"
                >
                  <span className="truncate pr-3">{item.name}</span>
                  <span className="text-muted-foreground">${Number(item.price).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No menu items yet.</p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button
            asChild
            className="btn-aurora w-full rounded-full font-semibold"
            disabled={restaurant.menuItems.length === 0}
          >
            <Link href={`/request-delivery?restaurant=${restaurant.id}` as any}>
              Order from here
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
          >
            <Link href={`/restaurants/${restaurant.id}` as any}>View menu &amp; reviews</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
