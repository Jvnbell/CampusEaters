import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { OperationsConsole } from '@/components/OperationsConsole';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Operations | CampusEats',
  description: 'Live status of the CampusEats autonomous delivery fleet.',
};

export default function OperationsPage() {
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
          Fleet operations center
        </span>
      </div>

      <main className="container mx-auto px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="space-y-3 text-center">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Operations
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
              Robot fleet <span className="gradient-text">operations</span>
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground text-pretty md:text-base">
              Live view of every delivery bot — current status, location, battery, and
              the order it is fulfilling right now.
            </p>
          </div>

          <AuthGate
            title="Sign in with an admin account"
            description="The operations console is restricted to CampusEats administrators."
          >
            <OperationsConsole />
          </AuthGate>
        </div>
      </main>
    </div>
  );
}
