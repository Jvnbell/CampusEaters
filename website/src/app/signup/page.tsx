import type { Metadata } from 'next';

import { AuthCard } from '@/components/auth/AuthCard';

export const metadata: Metadata = {
  title: 'Sign Up | CampusEats',
  description: 'Create a CampusEats account using your UT email address.',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950/80 px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white">Create your CampusEats account</h1>
          <p className="text-sm text-slate-400">
            Use your @ut.edu or @spartans.ut.edu email address to start requesting deliveries.
          </p>
        </div>
        <AuthCard variant="default" defaultMode="signUp" redirectPath="/" />
      </div>
    </div>
  );
}


