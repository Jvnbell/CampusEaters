'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { RestaurantWithMenuAndRating, Review } from '@/types/db';

const formatRating = (value: number) => (value > 0 ? value.toFixed(1) : '—');

const formatRelativeDate = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return '';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

type DetailResponse = {
  restaurant: RestaurantWithMenuAndRating;
  reviews: Review[];
};

export default function RestaurantDetailPage({
  params,
}: {
  // Next.js 15 wraps params in a Promise; `use()` unwraps it inside a client component.
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = use(params);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/restaurants/${restaurantId}`, { cache: 'no-store' });
        if (response.status === 404) {
          if (mounted) setNotFound(true);
          return;
        }
        if (!response.ok) throw new Error('Failed to load restaurant');
        const payload = (await response.json()) as DetailResponse;
        if (mounted) setData(payload);
      } catch (err) {
        console.error('[RestaurantDetailPage] load failed', err);
        toast.error('Unable to load this restaurant.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  const ratingBuckets = useMemo(() => {
    if (!data) return null;
    const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star ... 4 = 5 star
    for (const review of data.reviews) {
      const idx = Math.max(0, Math.min(4, review.rating - 1));
      counts[idx]! += 1;
    }
    return counts;
  }, [data]);

  if (isLoading) {
    return (
      <div className="relative isolate min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto space-y-6 px-4 py-12">
          <Skeleton className="h-10 w-32 rounded-full bg-white/5" />
          <Skeleton className="h-32 w-full rounded-2xl bg-white/5" />
          <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="relative isolate min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 py-16">
          <Card className="glass-panel-strong mx-auto max-w-xl border-0 text-center">
            <CardHeader>
              <CardTitle>Restaurant not found</CardTitle>
              <CardDescription>This restaurant is no longer available.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="btn-aurora rounded-full font-semibold">
                <Link href={'/restaurants' as any}>Back to all restaurants</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { restaurant, reviews } = data;

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
          <Link href={'/restaurants' as any}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            All restaurants
          </Link>
        </Button>
      </div>

      <main className="container mx-auto max-w-6xl space-y-10 px-4 pb-20 pt-6">
        <Card className="glass-panel-strong border-0 p-1">
          <CardHeader className="space-y-3">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" /> Restaurant
            </span>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle className="font-display text-3xl md:text-4xl">
                  {restaurant.name}
                </CardTitle>
                <CardDescription className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {restaurant.location}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <RatingPill rating={restaurant.averageRating} reviewCount={restaurant.reviewCount} />
                <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-medium text-muted-foreground">
                  <UtensilsCrossed className="mr-1.5 h-3.5 w-3.5" />
                  {restaurant.menuItems.length} menu items
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Order autonomously delivered by our campus fleet — usually arrives in 15–30 minutes.
            </p>
            <Button
              asChild
              className="btn-aurora rounded-full font-semibold"
              disabled={restaurant.menuItems.length === 0}
            >
              <Link href={`/request-delivery?restaurant=${restaurant.id}` as any}>
                Order from {restaurant.name}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
              <UtensilsCrossed className="h-5 w-5 text-secondary" />
              Menu
            </h2>
            {restaurant.menuItems.length === 0 ? (
              <Card className="glass-panel border-0">
                <CardHeader>
                  <CardTitle className="text-lg">No menu items yet</CardTitle>
                  <CardDescription>
                    The restaurant hasn&apos;t published a menu. Check back soon.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {restaurant.menuItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-primary/30 hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      {idx < 3 ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                          <Award className="h-3 w-3" /> Popular
                        </span>
                      ) : null}
                    </div>
                    <span className="font-display text-base font-semibold text-foreground">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
              <Star className="h-5 w-5 text-secondary" />
              Customer reviews
            </h2>

            <Card className="glass-panel border-0">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-4xl font-semibold text-foreground">
                    {formatRating(restaurant.averageRating)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    based on {restaurant.reviewCount} review
                    {restaurant.reviewCount === 1 ? '' : 's'}
                  </span>
                </div>
                {ratingBuckets ? (
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = ratingBuckets[stars - 1] ?? 0;
                      const total = restaurant.reviewCount || 1;
                      const pct = (count / total) * 100;
                      return (
                        <div key={stars} className="flex items-center gap-2 text-xs">
                          <span className="w-6 text-muted-foreground">{stars}★</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-muted-foreground">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {reviews.length === 0 ? (
              <Card className="glass-panel border-0">
                <CardContent className="space-y-2 p-5 text-center">
                  <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground/70" />
                  <p className="text-sm text-muted-foreground">
                    No reviews yet — be the first to order and rate {restaurant.name}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 8).map((review) => (
                  <Card key={review.id} className="glass-panel border-0">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {review.reviewer
                            ? `${review.reviewer.firstName} ${review.reviewer.lastName.charAt(0)}.`
                            : 'Anonymous'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(review.createdAt)}
                        </span>
                      </div>
                      <Stars value={review.rating} />
                      {review.comment ? (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

const RatingPill = ({ rating, reviewCount }: { rating: number; reviewCount: number }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
    <Star className="h-4 w-4 fill-secondary text-secondary" strokeWidth={0} />
    <span className="font-semibold text-foreground">{formatRating(rating)}</span>
    <span className="text-xs text-muted-foreground">
      ({reviewCount} review{reviewCount === 1 ? '' : 's'})
    </span>
  </span>
);

const Stars = ({ value }: { value: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`h-4 w-4 ${
          n <= value ? 'fill-secondary text-secondary' : 'text-muted-foreground/40'
        }`}
        strokeWidth={n <= value ? 0 : 1.5}
      />
    ))}
  </div>
);
