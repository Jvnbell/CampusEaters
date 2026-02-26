import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { RestaurantOrders } from '@/components/RestaurantOrders';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Restaurant Orders | CampusEats',
  description: 'Manage active CampusEats deliveries from your restaurant.',
};

export default function RestaurantOrdersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Button
            asChild
            variant="ghost"
            className="text-slate-300 transition hover:bg-slate-900/60 hover:text-white"
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
          <div className="text-sm text-slate-400">Restaurant Control Center</div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-white md:text-4xl">Manage active orders</h1>
            <p className="text-sm text-slate-400">
              Review incoming CampusEats deliveries, advance order statuses, and keep students up to date.
            </p>
          </div>

          <AuthGate
            title="Sign in with your restaurant account"
            description="Only verified restaurant accounts can manage CampusEats orders. Sign in with your UT-affiliated restaurant credentials to continue."
          >
            <RestaurantOrders />
          </AuthGate>
        </div>
      </main>
    </div>
  );
}



