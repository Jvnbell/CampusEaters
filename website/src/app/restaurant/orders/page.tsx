import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { RestaurantOrders } from '@/components/RestaurantOrders';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Restaurant Orders | CampusEats',
  description: 'Manage active CampusEats deliveries from your restaurant.',
};

export default function RestaurantOrdersPage() {
  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-15 blur-3xl" />
      </div>

      <div className="container mx-auto flex items-center justify-between px-4 pt-6 sm:px-6 lg:px-8">
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
        <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline">
          Restaurant control center
        </span>
      </div>

      <main className="container mx-auto px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="space-y-3 text-center">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Order management
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
              Manage active <span className="gradient-text">orders</span>
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground text-pretty md:text-base">
              Review incoming CampusEats deliveries, advance order statuses, and keep
              students up to date.
            </p>
          </div>

          <AuthGate
            title="Sign in with your restaurant account"
            description="Only verified restaurant accounts can manage CampusEats orders. Sign in with your UT-affiliated restaurant credentials to continue."
          >
            <RestaurantOrders />
          </AuthGate>
        </div>
      </main>
    </div>
  );
}
