'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Gauge,
  Navigation,
  Play,
  RotateCcw,
  RotateCw,
  Shield,
  Square,
  Truck,
} from 'lucide-react';

import AdminLogin from '@/components/AdminLogin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

type MotorData = {
  id: string;
  name: string;
  speed: number;
  direction: 'forward' | 'backward' | 'stop';
  pwm: number;
  enabled: boolean;
};

export default function AdminDashboard() {
  const { user, isLoading } = useSupabaseAuth();
  const [motors, setMotors] = useState<MotorData[]>([
    {
      id: 'left',
      name: 'Left Motor',
      speed: 75,
      direction: 'forward',
      pwm: 191,
      enabled: true,
    },
    {
      id: 'right',
      name: 'Right Motor',
      speed: 75,
      direction: 'forward',
      pwm: 191,
      enabled: true,
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMotors((prev) =>
        prev.map((motor) => ({
          ...motor,
          speed: Math.max(0, Math.min(100, motor.speed + (Math.random() - 0.5) * 2)),
          pwm: Math.round((motor.speed / 100) * 255),
        })),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getDirectionIcon = (direction: MotorData['direction']) => {
    switch (direction) {
      case 'forward':
        return <RotateCw className="h-5 w-5 text-green-600" />;
      case 'backward':
        return <RotateCcw className="h-5 w-5 text-red-600" />;
      default:
        return <Square className="h-5 w-5 text-slate-400" />;
    }
  };

  const getDirectionColor = (direction: MotorData['direction']) => {
    switch (direction) {
      case 'forward':
        return 'bg-green-600';
      case 'backward':
        return 'bg-red-600';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-300" />
              <h1 className="text-xl font-semibold text-slate-200">Admin Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl space-y-12">
          <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-cyan-400" />
                    <CardTitle className="text-slate-200">
                      {user ? 'System Status' : 'Restricted Access'}
                    </CardTitle>
                  </div>
                  <Badge className={user ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}>
                    {user ? 'Active' : 'Sign in required'}
                  </Badge>
                </div>
                <CardDescription className="text-slate-400">
                  {user
                    ? 'Arduino and Motor Driver Connection Status'
                    : 'Log in with an authorized email to view live system data.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-slate-700/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-slate-300">Arduino Status</span>
                    </div>
                    <p className="text-lg font-semibold text-green-400">Connected</p>
                  </div>
                  <div className="rounded-lg bg-slate-700/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-slate-300">Motor Driver</span>
                    </div>
                    <p className="text-lg font-semibold text-green-400">Operational</p>
                  </div>
                  <div className="rounded-lg bg-slate-700/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Play className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-slate-300">Control Mode</span>
                    </div>
                    <p className="text-lg font-semibold text-cyan-400">PWM Active</p>
                  </div>
                </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300">
                      Use the authentication panel to create an account or sign in. Only @ut.edu and @spartans.ut.edu
                      email addresses are permitted.
                    </p>
                    <p className="text-sm text-slate-400">
                      Once authenticated, you&apos;ll be able to monitor motor performance and delivery telemetry in
                      real time.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-200">Admin Access</CardTitle>
                <CardDescription className="text-slate-400">Secure authentication for authorized personnel</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminLogin />
              </CardContent>
            </Card>
          </section>

          {user && (
            <>
          <section>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {motors.map((motor) => (
                <Card key={motor.id} className="border-slate-700/50 bg-slate-800/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-slate-200">{motor.name}</CardTitle>
                      <Badge className={motor.enabled ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}>
                        {motor.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-400">Real-time motor performance data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">Direction</span>
                        <div className="flex items-center gap-2">
                          {getDirectionIcon(motor.direction)}
                          <Badge className={`${getDirectionColor(motor.direction)} text-white capitalize`}>
                            {motor.direction}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">Speed</span>
                        <span className="text-lg font-semibold text-cyan-400">{Math.round(motor.speed)}%</span>
                      </div>
                      <Progress value={motor.speed} className="h-3 bg-slate-200" />
                    </div>

                    <div className="rounded-lg bg-slate-700/50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">PWM Value</span>
                        <span className="font-mono text-2xl font-bold text-slate-200">{motor.pwm}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">Range: 0-255</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-700/50 pt-4">
                      <div>
                        <p className="mb-1 text-xs text-slate-400">Enable Pin</p>
                        <p className="text-sm font-semibold text-slate-200">{motor.enabled ? 'HIGH' : 'LOW'}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-slate-400">Direction Pin</p>
                        <p className="text-sm font-semibold text-slate-200">
                          {motor.direction === 'forward' ? 'HIGH' : motor.direction === 'backward' ? 'LOW' : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-200">Differential Control Status</CardTitle>
                <CardDescription className="text-slate-400">
                  Independent wheel control for turns and straight motion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg bg-slate-700/50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">Current Motion</span>
                      <Badge className="bg-blue-600 text-white">Straight Forward</Badge>
                    </div>
                    <p className="text-sm text-slate-400">
                      Both motors running at {Math.round(motors[0].speed)}% speed in forward direction
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-slate-700/50 p-4">
                      <p className="mb-1 text-xs text-slate-400">Left Motor Speed</p>
                      <p className="text-2xl font-bold text-cyan-400">{Math.round(motors[0].speed)}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-700/50 p-4">
                      <p className="mb-1 text-xs text-slate-400">Right Motor Speed</p>
                      <p className="text-2xl font-bold text-cyan-400">{Math.round(motors[1].speed)}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-200">Delivery Timeline Overview</CardTitle>
                <CardDescription className="text-slate-400">
                  Track current deliveries and robot status updates
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-lg bg-slate-700/40 p-4">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-slate-200">Active Deliveries</span>
                  </div>
                  <p className="text-3xl font-bold text-white">12</p>
                  <p className="text-xs text-slate-400">4 robots currently en route, 8 preparing</p>
                </div>
                <div className="space-y-3 rounded-lg bg-slate-700/40 p-4">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-slate-200">Average Arrival</span>
                  </div>
                  <p className="text-3xl font-bold text-white">15 min</p>
                  <p className="text-xs text-slate-400">Real-time route optimization enabled</p>
                </div>
                <div className="space-y-3 rounded-lg bg-slate-700/40 p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-slate-200">Safety Checks</span>
                  </div>
                  <p className="text-3xl font-bold text-white">100%</p>
                  <p className="text-xs text-slate-400">All robots passed diagnostics</p>
                </div>
                <div className="space-y-3 rounded-lg bg-slate-700/40 p-4">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-slate-200">Customer Satisfaction</span>
                  </div>
                  <p className="text-3xl font-bold text-white">4.9 / 5</p>
                  <p className="text-xs text-slate-400">Based on latest delivery feedback</p>
                </div>
              </CardContent>
            </Card>
          </section>
            </>
          )}

          {!user && !isLoading && (
            <section>
              <Card className="border-slate-700/50 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-slate-200">Need access?</CardTitle>
                  <CardDescription className="text-slate-400">
                    Create an account or sign in to unlock the full dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Supabase authentication keeps these controls limited to authorized campus staff. Once your email is
                    verified you&apos;ll automatically see live delivery metrics here.
                  </p>
                  <p className="text-sm text-slate-400">
                    Looking for general delivery services? Head back to the{' '}
                    <Link href="/" className="text-primary underline-offset-4 hover:underline">
                      main site
                    </Link>{' '}
                    to place or track orders without admin credentials.
                  </p>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </main>

      <footer className="mt-20 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-slate-400">
            © 2024 CampusEats. Admin Dashboard - Authorized Personnel Only
          </p>
        </div>
      </footer>
    </div>
  );
}

