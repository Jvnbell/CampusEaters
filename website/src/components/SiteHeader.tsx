'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { useCurrentProfile } from '@/hooks/use-current-profile';

const authenticatedNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/request-delivery', label: 'Request Delivery' },
  { href: '/track-package', label: 'Track Package' },
];

const restaurantNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/restaurant/orders', label: 'Manage Orders' },
];

const adminNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/operations', label: 'Operations' },
];

const marketingNavLinks = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#robot-fleet', label: 'Robot fleet' },
  { href: '/#get-started', label: 'Get started' },
];

const getIsActive = (pathname: string, href: string) => {
  const targetPath = href.startsWith('/#') ? '/' : href;
  if (targetPath === '/') {
    return pathname === '/';
  }
  return pathname.startsWith(targetPath);
};

export const SiteHeader = () => {
  const pathname = usePathname();
  const { supabase, user, isLoading } = useSupabaseAuth();
  const { profile } = useCurrentProfile();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setIsSigningOut(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Signed out successfully.');
  };

  const navLinks = user
    ? profile?.role === 'ADMIN'
      ? adminNavLinks
      : profile?.role === 'RESTAURANT'
        ? restaurantNavLinks
        : authenticatedNavLinks
    : marketingNavLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={'/' as any}
          className="group flex items-center gap-3 text-sm font-medium text-foreground"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-aurora text-background shadow-glow-sm transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/30" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight text-foreground">
              CampusEats
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
              Autonomous Delivery
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium text-muted-foreground md:flex">
          {navLinks.map((link) => {
            const active = getIsActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href as any}
                className={`relative rounded-full px-4 py-2 transition-colors duration-200 ${
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {active && (
                  <span className="absolute inset-0 -z-10 rounded-full bg-white/[0.06] ring-1 ring-inset ring-white/10" />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-9 w-16 animate-pulse rounded-full bg-white/5" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-white/5" />
            </div>
          ) : user ? (
            <Button
              onClick={handleSignOut}
              size="sm"
              variant="outline"
              disabled={isSigningOut}
              className="rounded-full border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.07] hover:text-foreground"
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={`rounded-full text-muted-foreground hover:bg-white/[0.05] hover:text-foreground ${
                  pathname === '/login' ? 'bg-white/[0.05] text-foreground' : ''
                }`}
              >
                <Link href={'/login' as any}>Log in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="btn-aurora rounded-full px-5 font-semibold"
              >
                <Link href={'/signup' as any}>Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
