import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';

import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Analytics | CampusEats',
  description:
    'SQL-backed fleet analytics: throughput time series, delivery-time percentiles, dispatcher health.',
};

export default function AdminAnalyticsPage() {
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
          <Link href={'/operations' as any}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to operations
          </Link>
        </Button>
        <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline">
          Analytics
        </span>
      </div>

      <main className="container mx-auto px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="space-y-3 text-center">
            <span className="eyebrow">
              <BarChart3 className="h-3.5 w-3.5" />
              Fleet analytics
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
              Throughput &amp; <span className="gradient-text">delivery percentiles</span>
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground text-pretty md:text-base">
              Computed in a single SQL round trip via{' '}
              <code className="rounded bg-white/[0.05] px-1.5 py-0.5 text-xs">
                fleet_analytics(p_days)
              </code>{' '}
              — daily series, p50/p90/p95/p99, and the live fleet snapshot.
            </p>
          </div>

          <AuthGate
            title="Sign in with an admin account"
            description="Analytics is restricted to CampusEats administrators."
          >
            <AnalyticsDashboard />
          </AuthGate>
        </div>
      </main>
    </div>
  );
}
