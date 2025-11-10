'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

const authenticatedNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/request-delivery', label: 'Request Delivery' },
  { href: '/track-package', label: 'Track Package' },
];

const marketingNavLinks = [
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#robot-fleet', label: 'Robot Fleet' },
  { href: '/#get-started', label: 'Get Started' },
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

  const navLinks = user ? authenticatedNavLinks : marketingNavLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-900">
            CampusEats
          </span>
          <span className="hidden text-sm font-medium text-slate-300 sm:inline">Autonomous Delivery</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-medium text-slate-300 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-2 transition ${
                getIsActive(pathname, link.href)
                  ? 'bg-slate-800/70 text-white shadow-inner shadow-blue-500/20'
                  : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-9 w-16 animate-pulse rounded-full bg-slate-800/80" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-slate-800/80" />
            </div>
          ) : user ? (
            <Button onClick={handleSignOut} size="sm" variant="outline" disabled={isSigningOut}>
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={`border border-transparent text-slate-100 hover:border-slate-700 hover:bg-slate-900/60 ${
                  pathname === '/login' ? 'border-slate-700 bg-slate-900/70 text-white' : ''
                }`}
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 text-slate-950 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                <Link href="/signup">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

