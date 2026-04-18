import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { OperationsConsole } from '@/components/OperationsConsole';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Operations | CampusEats',
  description: 'Live status of the CampusEats autonomous delivery fleet.',
};

export default function OperationsPage() {
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
          <div className="text-sm text-slate-400">Fleet Operations Center</div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              Robot fleet operations
            </h1>
            <p className="text-sm text-slate-400">
              Live view of every delivery bot — current status, location, battery, and the order
              it is fulfilling right now.
            </p>
          </div>

          <AuthGate
            title="Sign in with an admin account"
            description="The operations console is restricted to CampusEats administrators."
          >
            <OperationsConsole />
          </AuthGate>
        </div>
      </main>
    </div>
  );
}
