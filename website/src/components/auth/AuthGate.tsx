'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-lg border border-slate-800/60 bg-slate-900/70 shadow-xl shadow-blue-500/10">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10">
              <ShieldAlert className="h-6 w-6 text-blue-400" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold text-white">{title}</CardTitle>
              <CardDescription className="text-base text-slate-300">{description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
            {secondaryHref && secondaryLabel ? (
              <Button asChild variant="outline" className="w-full border-slate-700 text-slate-100">
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};


