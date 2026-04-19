'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

type AuthGateProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export const AuthGate = ({
  children,
  title = 'Sign in required',
  description = 'You need to be signed in with your UT email to access this page.',
  actionLabel = 'Sign in',
  actionHref = '/login',
  secondaryLabel = 'Create an account',
  secondaryHref = '/signup',
}: AuthGateProps) => {
  const { user, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
          <Loader2 className="invisible" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="glass-panel-strong w-full max-w-lg space-y-6 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-aurora text-background shadow-glow-sm">
            <ShieldAlert className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground text-pretty">{description}</p>
          </div>
          <div className="space-y-3">
            <Button
              asChild
              className="btn-aurora w-full rounded-full font-semibold"
            >
              <Link href={actionHref as any}>{actionLabel}</Link>
            </Button>
            {secondaryHref && secondaryLabel ? (
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full border-white/15 bg-white/[0.03] text-foreground hover:bg-white/[0.07] hover:text-foreground"
              >
                <Link href={secondaryHref as any}>{secondaryLabel}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
