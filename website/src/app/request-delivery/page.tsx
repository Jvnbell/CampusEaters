import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import DeliveryRequest from '@/components/DeliveryRequest';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Request Delivery | CampusEats',
  description: 'Schedule a CampusEats autonomous delivery.',
};

export default function RequestDeliveryPage() {
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
              Request a Delivery
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-slate-300">
              Fill out the form below to request a robot delivery. Our autonomous fleet will handle your package with
              care.
            </p>
          </div>

          <AuthGate
            title="Sign in to request a delivery"
            description="CampusEats deliveries are available to authenticated UT students and staff. Sign in with your campus email to get started."
          >
            <DeliveryRequest />
          </AuthGate>
        </div>
      </main>
    </div>
  );
}

