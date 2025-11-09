import Link from 'next/link';
import { ArrowRight, Cpu, Globe, MapPin, Package, Shield, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 h-72 w-72 animate-pulse rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-96 w-96 animate-pulse rounded-full bg-cyan-500/10 blur-3xl delay-1000" />
          <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500/5 to-cyan-500/5 blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-20">
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <h1 className="text-6xl font-bold leading-tight text-transparent md:text-8xl bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text">
                CampusEats
              </h1>
              <div className="flex items-center justify-center gap-2 text-cyan-400">
                <Cpu className="h-6 w-6" />
                <span className="text-lg font-medium">AI-Powered Delivery Network</span>
                <Cpu className="h-6 w-6" />
              </div>
            </div>

            <p className="mx-auto max-w-3xl text-xl leading-relaxed text-slate-300 md:text-2xl">
              Experience the future of autonomous delivery. Our intelligent robotic fleet delivers your packages with
              precision, speed, and reliability.
            </p>

            <div className="flex flex-col items-center justify-center gap-6 pt-8 sm:flex-row">
              <Button
                asChild
                className="group min-w-[200px] rounded-2xl border-2 border-blue-400/30 bg-gradient-to-r from-blue-500 to-cyan-500 px-12 py-6 text-xl font-bold text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:border-blue-300/50 hover:from-blue-600 hover:to-cyan-600 hover:shadow-blue-500/40"
              >
                <Link href="/request-delivery">
                  <Package className="mr-3 h-8 w-8" />
                  Request Delivery
                  <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-2" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="group min-w-[200px] transform rounded-2xl border-4 border-cyan-400 bg-slate-800/30 px-12 py-6 text-xl font-bold text-cyan-300 shadow-xl transition-all duration-300 hover:scale-110 hover:bg-slate-700/40 hover:text-cyan-200 hover:shadow-cyan-500/20"
              >
                <Link href="/track-package">
                  <MapPin className="mr-3 h-8 w-8" />
                  Track Package
                  <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-2" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="group min-w-[200px] transform rounded-2xl border-4 border-slate-300 bg-slate-800/30 px-12 py-6 text-xl font-bold text-slate-200 shadow-xl transition-all duration-300 hover:scale-110 hover:bg-slate-700/40 hover:text-white hover:shadow-slate-400/20"
              >
                <Link href="/admin">
                  <Shield className="mr-3 h-8 w-8" />
                  Admin Portal
                  <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-2" />
                </Link>
              </Button>
            </div>

            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 pt-12 md:grid-cols-3">
              <div className="flex flex-col items-center space-y-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
                <div className="rounded-full bg-blue-500/20 p-3">
                  <Zap className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Lightning Fast</h3>
                <p className="text-center text-sm text-slate-400">Average delivery time under 30 minutes</p>
              </div>

              <div className="flex flex-col items-center space-y-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
                <div className="rounded-full bg-cyan-500/20 p-3">
                  <Globe className="h-8 w-8 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">24/7 Service</h3>
                <p className="text-center text-sm text-slate-400">Round-the-clock autonomous delivery</p>
              </div>

              <div className="flex flex-col items-center space-y-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
                <div className="rounded-full bg-green-500/20 p-3">
                  <Cpu className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">AI Powered</h3>
                <p className="text-center text-sm text-slate-400">Smart routing and optimization</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <footer className="mt-20 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-slate-400">© 2024 CampusEats. Delivering the future, today.</p>
        </div>
      </footer>
    </div>
  );
}

