'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Globe,
  Headset,
  MapPin,
  Package,
  Zap,
  Truck,
  Sparkle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { useCurrentProfile, type UserProfile } from '@/hooks/use-current-profile';

const MarketingHero = () => (
  <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
    <header className="relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 h-72 w-72 animate-pulse rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-96 w-96 animate-pulse rounded-full bg-cyan-500/10 blur-3xl delay-1000" />
        <div className="absolute top-1/2 left-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500/5 to-cyan-500/5 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-24">
        <div className="space-y-8 text-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Autonomous campus logistics
            </span>
            <h1 className="text-5xl font-bold leading-tight text-transparent md:text-7xl bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text">
              CampusEats
            </h1>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-300 md:text-xl">
              The University of Tampa’s first autonomous delivery network. Order from on-campus restaurants and let our
              AI-guided robot fleet handle the last-mile delivery to dorms, labs, and study halls.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 pt-6 sm:flex-row">
            <Button
              asChild
              className="group min-w-[200px] rounded-2xl border-2 border-blue-400/30 bg-gradient-to-r from-blue-500 to-cyan-500 px-10 py-5 text-lg font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:border-blue-300/50 hover:from-blue-600 hover:to-cyan-600 hover:shadow-blue-500/40"
            >
              <Link href="/signup">
                <Package className="mr-3 h-6 w-6" />
                Activate your CampusEats account
                <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-2" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="group min-w-[200px] transform rounded-2xl border-4 border-cyan-400/80 bg-slate-900/70 px-10 py-5 text-lg font-semibold text-cyan-200 shadow-xl transition-all duration-300 hover:scale-105 hover:border-cyan-300 hover:bg-slate-800/70 hover:text-cyan-100 hover:shadow-cyan-500/20"
            >
              <Link href="#how-it-works">
                <MapPin className="mr-3 h-6 w-6" />
                How the robot delivery works
                <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>

    <section className="pb-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col items-start space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
            <div className="rounded-full bg-blue-500/20 p-3">
              <Zap className="h-8 w-8 text-blue-300" />
            </div>
            <h3 className="text-lg font-semibold">Lightning fast drop-offs</h3>
            <p className="text-sm text-slate-400">
              Delivery robots plan optimized routes that average a 15-minute campus drop-off window.
            </p>
          </div>

          <div className="flex flex-col items-start space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
            <div className="rounded-full bg-cyan-500/20 p-3">
              <Globe className="h-8 w-8 text-cyan-300" />
            </div>
            <h3 className="text-lg font-semibold">Built for UT campus life</h3>
            <p className="text-sm text-slate-400">
              From residence halls to riverside classrooms, our network connects every corner of campus.
            </p>
          </div>

          <div className="flex flex-col items-start space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
            <div className="rounded-full bg-green-500/20 p-3">
              <Cpu className="h-8 w-8 text-green-300" />
            </div>
            <h3 className="text-lg font-semibold">AI-driven reliability</h3>
            <p className="text-sm text-slate-400">
              Autonomous driving, live telemetry, and real-time tracking keep deliveries on schedule.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section id="how-it-works" className="border-t border-slate-800/70 bg-slate-900/60 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">How CampusEats works</h2>
          <p className="mt-3 text-lg text-slate-300">
            A fully integrated pipeline—from ordering to robotic fulfillment—designed for seamless student experiences.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            {
              title: '1. Request',
              description:
                'Students place delivery requests using verified UT email accounts. Pickup details go straight to our system.',
              icon: Package,
            },
            {
              title: '2. Dispatch',
              description:
                'CampusEats routes the request to the best robot. AI maps a campus-safe route and schedules the pickup window.',
              icon: Truck,
            },
            {
              title: '3. Delivery',
              description:
                'Real-time tracking keeps students updated until the robot securely hands off at the destination.',
              icon: MapPin,
            },
          ].map((step) => (
            <div
              key={step.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-6 transition hover:border-cyan-500/50 hover:bg-slate-900/80"
            >
              <div className="flex items-center gap-3">
                <step.icon className="h-8 w-8 text-cyan-300" />
                <h3 className="text-xl font-semibold text-white">{step.title}</h3>
              </div>
              <p className="mt-3 text-sm text-slate-300">{step.description}</p>
              <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="robot-fleet" className="py-24">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">AI robotics powering campus logistics</h2>
            <p className="text-lg text-slate-300">
              CampusEats deploys autonomous delivery robots engineered by UT students. Sensor fusion, GPS, and
              vision-based navigation allow our fleet to maneuver sidewalks safely while keeping deliveries secure.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { stat: '15 min', label: 'Average delivery completion' },
                { stat: '100%', label: 'Coverage across UT campus' },
                { stat: '0 emissions', label: 'Fully electric robot fleet' },
                { stat: '360° vision', label: 'Sensor fusion awareness' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-2xl font-semibold text-white">{item.stat}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-lg shadow-blue-500/10">
            <h3 className="text-xl font-semibold text-white">Meet the CampusEats robot</h3>
            <p className="text-sm text-slate-300">
              Designed and built at UT, our robot balances rugged hardware with custom software for reliable autonomy.
              From climate-controlled storage to automated unlock hand-offs, every detail supports safe delivery.
            </p>
            <div className="space-y-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-200">Technical highlights</p>
              <ul className="space-y-2 text-sm text-blue-100">
                <li>• Autonomous routing and obstacle avoidance tailored to campus pathways</li>
                <li>• Secure storage bay with PIN-based unlock at drop-off</li>
                <li>• Real-time telemetry and delivery tracking through the CampusEats app</li>
              </ul>
            </div>
            <Button asChild variant="secondary" className="w-full bg-slate-800 text-slate-100 hover:bg-slate-700">
              <Link href="/signup">Create your account</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>

    <section id="get-started" className="border-t border-slate-800/70 bg-slate-950/70 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Ready to try autonomous delivery at UT?</h2>
          <p className="text-lg text-slate-300">
            Activate your CampusEats account to request deliveries from Chick-fil-A, Aussie Grill, and other campus
            partners. Our AI robot will swap the walk for a seamless drop-off at your residence or study space.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              className="min-w-[200px] bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-5 text-base font-semibold text-slate-950 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
            >
              <Link href="/signup">Create your CampusEats account</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-w-[200px] border border-slate-700 px-8 py-5 text-base font-semibold text-slate-100 hover:bg-slate-800/60"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>

    <footer className="border-t border-slate-800/60 bg-slate-950/80">
      <div className="container mx-auto px-4 py-10 text-center text-sm text-slate-500">
        © 2024 CampusEats · UTampa Autonomous Delivery Initiative
      </div>
    </footer>
  </div>
);

const RestaurantHome = ({ profile }: { profile: UserProfile }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20">
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-5xl space-y-12 rounded-3xl border border-slate-800/60 bg-slate-900/60 p-10 shadow-lg shadow-cyan-500/10">
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-cyan-200">
            <Sparkle className="h-4 w-4" />
            Restaurant command center
          </span>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">Welcome back, {profile.firstName}</h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Keep your CampusEats queue moving—monitor new requests, prep meals on time, and update robot handoffs in one
            place.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-blue-500/40 bg-blue-500/15 p-6 shadow-lg shadow-blue-500/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Manage active orders</h2>
                  <p className="mt-2 text-sm text-blue-100/80">
                    Review incoming CampusEats requests, confirm prep windows, and update the robot handoff status as your
                    team works.
                  </p>
                </div>
                <Package className="h-8 w-8 text-cyan-200" />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/restaurant/orders">
                    Open order management
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-6 w-6 text-slate-200" />
                <h3 className="text-lg font-semibold text-white">Kitchen operations checklist</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <span>Confirm pickup windows with CampusEats bots before meals leave the line.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <span>Stage clearly labeled orders so the robot team can verify contents quickly.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <span>Update each order status as soon as the robot departs to keep students notified in real time.</span>
                </li>
              </ul>
              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400">
                Pro tip: keep this dashboard open on a dedicated tablet so your team sees new orders the moment they
                arrive.
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
            <div className="flex items-center gap-3">
              <Headset className="h-6 w-6 text-cyan-200" />
              <h3 className="text-lg font-semibold text-white">Restaurant resources</h3>
            </div>
            <p className="text-sm text-slate-300">
              Need to adjust menu availability, update prep times, or report an operational issue? The CampusEats ops team
              is ready to help.
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="mailto:support@campuseats.com">
                  Email operations
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-slate-700 text-slate-100 hover:bg-slate-800/70"
              >
                <Link href="/restaurant/orders">
                  View live queue
                  <Truck className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-100/80">
              Live status updates push straight to students. Keep orders marked accurately so the robot fleet stays on
              schedule.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const UserHome = ({ profile }: { profile: UserProfile | null }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20">
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800/60 bg-slate-900/60 p-10 shadow-lg shadow-cyan-500/10">
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-cyan-200">
            <Sparkle className="h-4 w-4" />
            Autonomous deliveries available now
          </span>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            {profile ? `Welcome back, ${profile.firstName}` : 'Welcome back to CampusEats'}
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Ready for another delivery? Request fresh meals from your favorite campus restaurants or track your active
            orders in real time.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-6 text-left">
            <div className="flex items-center gap-3">
              <Package className="h-10 w-10 text-cyan-200" />
              <div>
                <h2 className="text-xl font-semibold text-white">Request a Delivery</h2>
                <p className="text-sm text-cyan-100/80">
                  Schedule campus-to-campus deliveries in minutes. Customize pickup and drop-off preferences.
                </p>
              </div>
            </div>
            <Button asChild className="mt-6 w-full">
              <Link href="/request-delivery">
                Start a new request
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 text-left">
            <div className="flex items-center gap-3">
              <Truck className="h-10 w-10 text-slate-200" />
              <div>
                <h2 className="text-xl font-semibold text-white">Track deliveries</h2>
                <p className="text-sm text-slate-300">
                  Follow real-time progress for active deliveries and revisit your order history.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="mt-6 w-full border-slate-700 text-slate-100"
            >
              <Link href="/track-package">
                View my deliveries
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AuthenticatedHome = ({ profile }: { profile: UserProfile | null }) => {
  if (profile?.role === 'RESTAURANT') {
    return <RestaurantHome profile={profile} />;
  }

  return <UserHome profile={profile} />;
};

export const HomeContent = () => {
  const { user, isLoading } = useSupabaseAuth();
  const { profile, isLoading: profileLoading } = useCurrentProfile();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <MarketingHero />;
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return <AuthenticatedHome profile={profile} />;
};


