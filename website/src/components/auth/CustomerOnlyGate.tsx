'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldAlert, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCurrentProfile } from '@/hooks/use-current-profile';

/**
 * Wrapper that only lets `USER` accounts through. ADMIN (operations) and
 * RESTAURANT roles see a friendly explainer and a link to their own dashboard
 * instead of the customer-facing flow.
 */
export const CustomerOnlyGate = ({ children }: { children: ReactNode }) => {
  const { profile, isLoading } = useCurrentProfile();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile && profile.role !== 'USER') {
    const isAdmin = profile.role === 'ADMIN';
    return (
      <Card className="border border-amber-500/30 bg-amber-500/10">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
            <ShieldAlert className="h-5 w-5 text-amber-200" />
          </div>
          <CardTitle className="text-amber-100">
            {isAdmin ? 'Operations accounts can’t request deliveries' : 'Restaurant accounts can’t request deliveries'}
          </CardTitle>
          <CardDescription className="text-amber-200/80">
            {isAdmin
              ? 'You’re signed in as an operations admin. Use the operations console to monitor the bot fleet — placing customer orders is restricted to student accounts.'
              : 'You’re signed in as a restaurant account. Use the restaurant order management dashboard to fulfill incoming deliveries.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={(isAdmin ? '/operations' : '/restaurant/orders') as any}>
              {isAdmin ? 'Open operations console' : 'Open order management'}
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-amber-400/40 text-amber-100 hover:bg-amber-500/20">
            <Link href="/">Return to home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};
