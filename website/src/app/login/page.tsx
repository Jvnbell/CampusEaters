import type { Metadata } from 'next';

import { AuthCard } from '@/components/auth/AuthCard';

export const metadata: Metadata = {
  title: 'Login | CampusEats',
  description: 'Sign in to access CampusEats delivery services.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950/80 px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white">Welcome back to CampusEats</h1>
          <p className="text-sm text-slate-400">
            Sign in with your UT-affiliated email address to manage deliveries and track orders.
          </p>
        </div>
        <AuthCard variant="default" defaultMode="signIn" redirectPath="/" />
      </div>
    </div>
  );
}


