'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/request-delivery', label: 'Request Delivery' },
  { href: '/track-package', label: 'Track Package' },
  { href: '/admin', label: 'Admin' },
];

const isActivePath = (pathname: string, target: string) => {
  if (target === '/') {
    return pathname === '/';
  }

  return pathname.startsWith(target);
};

export const SiteHeader = () => {
  const pathname = usePathname();
  const { supabase, user, isLoading } = useSupabaseAuth();
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-900">
            CampusEats
          </span>
          <span className="hidden text-sm font-medium text-slate-300 sm:inline">Autonomous Delivery</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-medium text-slate-300 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-2 transition hover:text-white ${isActivePath(pathname, link.href) ? 'bg-slate-800/60 text-white' : 'text-slate-300 hover:bg-slate-800/40'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-9 w-16 animate-pulse rounded-full bg-slate-800" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-slate-800" />
            </div>
          ) : user ? (
            <>
              <Button
                asChild
                variant="ghost"
                className={`hidden text-slate-200 hover:text-white md:inline-flex ${
                  pathname.startsWith('/admin') ? 'bg-slate-800/60' : ''
                }`}
              >
                <Link href="/admin">Dashboard</Link>
              </Button>
              <Button onClick={handleSignOut} size="sm" variant="outline" disabled={isSigningOut}>
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={pathname === '/login' ? 'bg-slate-800/60 text-white' : 'text-slate-100'}
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};


