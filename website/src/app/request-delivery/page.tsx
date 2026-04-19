import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { AdminCatalogHealthBannerGate } from '@/components/AdminCatalogHealthBannerGate';
import DeliveryRequest from '@/components/DeliveryRequest';
import { AuthGate } from '@/components/auth/AuthGate';
import { CustomerOnlyGate } from '@/components/auth/CustomerOnlyGate';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Request Delivery | CampusEats',
  description: 'Schedule a CampusEats autonomous delivery.',
};

export default function RequestDeliveryPage() {
  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-15 blur-3xl" />
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
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 space-y-4 text-center">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              New delivery
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
              Request a <span className="gradient-text">delivery</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
              Pick a campus restaurant, choose your items, and our autonomous fleet
              will handle the rest.
            </p>
          </div>

          <AuthGate
            title="Sign in to request a delivery"
            description="CampusEats deliveries are available to authenticated UT students and staff. Sign in with your campus email to get started."
          >
            <CustomerOnlyGate>
              <AdminCatalogHealthBannerGate />
              <DeliveryRequest />
            </CustomerOnlyGate>
          </AuthGate>
        </div>
      </main>
    </div>
  );
}
