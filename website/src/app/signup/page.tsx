import type { Metadata } from 'next';
import { Sparkles, Zap, Bot, Leaf } from 'lucide-react';

import { AuthCard } from '@/components/auth/AuthCard';

export const metadata: Metadata = {
  title: 'Sign Up | CampusEats',
  description: 'Create a CampusEats account using your UT email address.',
};

export default function SignupPage() {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-15 blur-3xl" />
      </div>

      <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.05fr,1fr] lg:gap-16">
        <div className="hidden flex-col justify-between lg:flex">
          <div className="space-y-6">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Join CampusEats
            </span>
            <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight text-foreground text-balance">
              Skip the walk.{' '}
              <span className="gradient-text">Let a robot bring it.</span>
            </h1>
            <p className="max-w-md text-base text-muted-foreground text-pretty">
              Create an account with your @ut.edu or @spartans.ut.edu email and start
              ordering from on-campus restaurants. Our autonomous fleet handles the
              rest.
            </p>
          </div>

          <ul className="space-y-3 text-sm text-foreground/90">
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-secondary ring-1 ring-inset ring-white/10">
                <Zap className="h-4 w-4" />
              </span>
              Average 15-minute delivery window
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-secondary ring-1 ring-inset ring-white/10">
                <Bot className="h-4 w-4" />
              </span>
              Track your robot in real time
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-secondary ring-1 ring-inset ring-white/10">
                <Leaf className="h-4 w-4" />
              </span>
              Zero-emission, fully electric fleet
            </li>
          </ul>
        </div>

        <div className="w-full max-w-lg justify-self-end space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Create your CampusEats account
            </h2>
            <p className="text-sm text-muted-foreground">
              Use your @ut.edu or @spartans.ut.edu email address to start requesting
              deliveries.
            </p>
          </div>
          <AuthCard variant="default" defaultMode="signUp" redirectPath="/" />
        </div>
      </div>
    </div>
  );
}
