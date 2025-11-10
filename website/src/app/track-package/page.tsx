import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import TrackDelivery from '@/components/TrackDelivery';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Track Package | CampusEats',
  description: 'Check the status of your CampusEats delivery in real time.',
};

export default function TrackPackagePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            asChild
            variant="ghost"
            className="text-slate-300 transition hover:bg-slate-800/50 hover:text-white"
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 space-y-4 text-center">
            <h1 className="text-4xl font-bold text-transparent md:text-5xl bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text">
              Track Your Package
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-slate-300">
              Enter your tracking ID to see real-time updates on your delivery status and location.
            </p>
          </div>

          <AuthGate
            title="Sign in to track your deliveries"
            description="Track Package combines your active deliveries and order history. Please sign in with your UT email to continue."
          >
            <TrackDelivery />
          </AuthGate>
        </div>
      </main>

      <footer className="mt-20 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-slate-400">© 2024 CampusEats. Delivering the future, today.</p>
        </div>
      </footer>
    </div>
  );
}

