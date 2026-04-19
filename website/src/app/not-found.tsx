'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', pathname);
  }, [pathname]);

  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-15 blur-3xl" />
      </div>

      <div className="glass-panel-strong w-full max-w-lg space-y-6 p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-aurora text-background shadow-glow-sm">
          <Compass className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div className="space-y-2">
          <p className="font-display text-7xl font-bold leading-none gradient-text bg-[length:200%_auto] animate-gradient-x">
            404
          </p>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            We can&apos;t find that page
          </h1>
          <p className="text-sm text-muted-foreground">
            The route <code className="rounded bg-white/[0.05] px-1.5 py-0.5 text-xs">{pathname}</code>{' '}
            doesn&apos;t exist. Let&apos;s get you back on course.
          </p>
        </div>
        <Button asChild className="btn-aurora w-full rounded-full font-semibold">
          <Link href="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Return to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
