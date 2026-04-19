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
  Sparkles,
  Activity,
  PlugZap,
  ShieldCheck,
  Battery,
  Radio,
} from 'lucide-react';

import { AdminCatalogHealthBanner } from '@/components/AdminCatalogHealthBanner';
import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { useCurrentProfile, type UserProfile } from '@/hooks/use-current-profile';

/* -------------------------------------------------------------------------- */
/* Marketing landing                                                           */
/* -------------------------------------------------------------------------- */

const features = [
  {
    icon: Zap,
    title: 'Lightning fast drop-offs',
    description:
      'Robots plan optimized routes that average a 15-minute window from kitchen to dorm.',
    accent: 'from-sky-400/30 to-blue-500/10 text-sky-200',
  },
  {
    icon: Globe,
    title: 'Built for UT campus life',
    description:
      'From riverside classrooms to residence halls, our network reaches every corner of campus.',
    accent: 'from-cyan-400/30 to-teal-500/10 text-cyan-200',
  },
  {
    icon: Cpu,
    title: 'AI-driven reliability',
    description:
      'Sensor fusion, GPS, and live telemetry keep deliveries on schedule — every single time.',
    accent: 'from-violet-400/30 to-fuchsia-500/10 text-violet-200',
  },
];

const steps = [
  {
    title: 'Request',
    description:
      'Students place delivery requests with their verified UT email. Pickup details flow into our dispatcher in real time.',
    icon: Package,
  },
  {
    title: 'Dispatch',
    description:
      'CampusEats routes the order to the best-fit robot. AI maps a campus-safe route and schedules a pickup window.',
    icon: Truck,
  },
  {
    title: 'Delivery',
    description:
      'Real-time tracking keeps students updated until the robot completes a secure hand-off at the destination.',
    icon: MapPin,
  },
];

const stats = [
  { stat: '15 min', label: 'Average delivery time' },
  { stat: '100%', label: 'UT campus coverage' },
  { stat: '0 emissions', label: 'Fully electric fleet' },
  { stat: '360°', label: 'Sensor-fusion vision' },
];

const MarketingHero = () => (
  <div className="relative isolate overflow-hidden">
    {/* Hero --------------------------------------------------------------- */}
    <header className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-25 blur-3xl" />
        <div className="absolute top-40 left-10 h-72 w-72 animate-float rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 animate-float rounded-full bg-accent/20 blur-3xl [animation-delay:1.5s]" />
      </div>

      <div className="container relative mx-auto px-4 pb-16 pt-24 md:pt-32">
        <div className="mx-auto max-w-4xl space-y-8 text-center">
          <span className="eyebrow animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_currentColor]" />
            Autonomous campus logistics
          </span>

          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground text-balance md:text-7xl animate-fade-up [animation-delay:80ms]">
            Hungry? Stay put.{' '}
            <span className="gradient-text bg-[length:200%_auto] animate-gradient-x">
              Our robots are on the way.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty md:text-xl animate-fade-up [animation-delay:160ms]">
            CampusEats is the University of Tampa’s first autonomous delivery network.
            Order from on-campus restaurants and let our AI-guided robot fleet handle
            the last mile to dorms, labs, and study halls.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row animate-fade-up [animation-delay:240ms]">
            <Button
              asChild
              className="btn-aurora group h-14 min-w-[240px] rounded-full px-8 text-base font-semibold"
            >
              <Link href="/signup">
                <Package className="mr-1 h-5 w-5" />
                Activate your account
                <ArrowRight className="ml-1 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="group h-14 min-w-[240px] rounded-full border-white/15 bg-white/[0.03] px-8 text-base font-semibold text-foreground backdrop-blur-md transition hover:border-white/30 hover:bg-white/[0.07] hover:text-foreground"
            >
              <Link href="#how-it-works">
                <MapPin className="mr-1 h-5 w-5 text-secondary" />
                How robot delivery works
                <ArrowRight className="ml-1 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>
          </div>

          <div className="mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground/80 animate-fade-up [animation-delay:320ms]">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
              UT-verified accounts
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:block" />
            <span className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-secondary" />
              Live order tracking
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:block" />
            <span className="flex items-center gap-2">
              <Battery className="h-3.5 w-3.5 text-secondary" />
              Zero-emission fleet
            </span>
          </div>
        </div>
      </div>
    </header>

    {/* Feature triplet ---------------------------------------------------- */}
    <section className="relative pb-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description, accent }) => (
            <div
              key={title}
              className="glass-panel hover-lift group flex flex-col items-start gap-4 p-7"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} ring-1 ring-inset ring-white/10`}
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How it works ------------------------------------------------------- */}
    <section id="how-it-works" className="relative border-y border-white/5 bg-background/40 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <span className="eyebrow">The pipeline</span>
          <h2 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
            How CampusEats works
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            A fully integrated pipeline — from ordering to robotic fulfillment — designed
            for a seamless student experience.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="glass-panel group relative overflow-hidden p-7 transition duration-300 hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-5xl font-bold leading-none text-white/10 transition group-hover:text-white/20">
                  0{index + 1}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-secondary ring-1 ring-inset ring-white/10">
                  <step.icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-gradient-aurora opacity-0 blur-3xl transition duration-500 group-hover:opacity-30" />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Robot fleet -------------------------------------------------------- */}
    <section id="robot-fleet" className="relative py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr,1fr]">
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="eyebrow">AI robotics</span>
              <h2 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
                Powering campus logistics with student-built robots
              </h2>
              <p className="text-lg text-muted-foreground text-pretty">
                CampusEats deploys autonomous delivery robots engineered by UT students.
                Sensor fusion, GPS, and vision-based navigation let our fleet maneuver
                sidewalks safely while keeping deliveries secure.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="glass-panel hover-lift flex flex-col gap-1 p-5"
                >
                  <div className="font-display text-2xl font-semibold text-foreground">
                    {item.stat}
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-aurora opacity-20 blur-2xl" />
            <div className="glass-panel-strong relative space-y-5 overflow-hidden p-8">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Fleet preview</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Online
                </span>
              </div>

              <h3 className="font-display text-2xl font-semibold text-foreground">
                Meet the CampusEats robot
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Designed and built at UT, our robot pairs rugged hardware with custom
                software for reliable autonomy. From climate-controlled storage to
                automated unlock hand-offs, every detail supports safe delivery.
              </p>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                  Technical highlights
                </p>
                <ul className="space-y-2.5 text-sm text-foreground/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                    Autonomous routing &amp; obstacle avoidance tuned to campus pathways
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                    Secure storage bay with PIN-based unlock at drop-off
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                    Real-time telemetry &amp; tracking through the CampusEats app
                  </li>
                </ul>
              </div>

              <Button
                asChild
                className="btn-aurora w-full rounded-full font-semibold"
              >
                <Link href="/signup">
                  Create your account
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>

              <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* CTA --------------------------------------------------------------- */}
    <section id="get-started" className="relative pb-28 pt-12">
      <div className="container mx-auto px-4">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-card p-10 shadow-soft md:p-14">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -right-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-accent/30 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--secondary)/0.18),_transparent_60%)]" />
          </div>

          <div className="relative mx-auto max-w-2xl space-y-6 text-center">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Ready when you are
            </span>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
              Ready to try autonomous delivery at UT?
            </h2>
            <p className="text-lg text-muted-foreground text-pretty">
              Activate your CampusEats account to request deliveries from Chick-fil-A,
              Aussie Grill, and other campus partners. Our AI robot will swap the walk
              for a seamless drop-off at your residence or study space.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <Button
                asChild
                className="btn-aurora h-12 min-w-[220px] rounded-full px-8 font-semibold"
              >
                <Link href="/signup">
                  Create your account
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 min-w-[220px] rounded-full border-white/15 bg-white/[0.03] px-8 font-semibold text-foreground hover:bg-white/[0.07] hover:text-foreground"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Authenticated dashboards                                                    */
/* -------------------------------------------------------------------------- */

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative isolate min-h-[calc(100vh-4rem)] py-16 md:py-20">
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-15 blur-3xl" />
    </div>
    <div className="container mx-auto px-4">{children}</div>
  </div>
);

const RestaurantHome = ({ profile }: { profile: UserProfile }) => (
  <PageShell>
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="space-y-4 text-center">
        <span className="eyebrow">
          <Sparkles className="h-3.5 w-3.5" />
          Restaurant command center
        </span>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
          Welcome back, <span className="gradient-text">{profile.firstName}</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
          Keep your CampusEats queue moving — monitor new requests, prep meals on time,
          and update robot hand-offs in one place.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="glass-panel-strong gradient-border relative overflow-hidden p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                  Active orders
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
                  Manage your live queue
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Review incoming CampusEats requests, confirm prep windows, and update
                  the robot hand-off status as your team works.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-secondary ring-1 ring-inset ring-white/10">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6">
              <Button asChild className="btn-aurora w-full rounded-full font-semibold sm:w-auto">
                <Link href="/restaurant/orders">
                  Open order management
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="glass-panel p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-foreground ring-1 ring-inset ring-white/10">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Kitchen operations checklist
              </h3>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-foreground/90">
              {[
                'Confirm pickup windows with CampusEats bots before meals leave the line.',
                'Stage clearly labeled orders so the robot team can verify contents quickly.',
                'Update each order status as soon as the robot departs to keep students notified in real time.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Pro tip:</span> keep this
              dashboard open on a dedicated tablet so your team sees new orders the
              moment they arrive.
            </div>
          </div>
        </div>

        <div className="glass-panel space-y-5 p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-secondary ring-1 ring-inset ring-white/10">
              <Headset className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              Restaurant resources
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Need to adjust menu availability, update prep times, or report an
            operational issue? The CampusEats ops team is here to help.
          </p>
          <div className="space-y-3">
            <Button asChild className="btn-aurora w-full rounded-full font-semibold">
              <Link href="mailto:support@campuseats.com">
                Email operations
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full rounded-full border-white/15 bg-white/[0.03] text-foreground hover:bg-white/[0.07] hover:text-foreground"
            >
              <Link href="/restaurant/orders">
                View live queue
                <Truck className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-xs text-secondary-foreground/90">
            Live status updates push straight to students. Keep orders marked
            accurately so the robot fleet stays on schedule.
          </div>
        </div>
      </div>
    </div>
  </PageShell>
);

const UserHome = ({ profile }: { profile: UserProfile | null }) => (
  <PageShell>
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="space-y-4 text-center">
        <span className="eyebrow">
          <Sparkles className="h-3.5 w-3.5" />
          Autonomous deliveries available now
        </span>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
          {profile ? (
            <>
              Welcome back,{' '}
              <span className="gradient-text">{profile.firstName}</span>
            </>
          ) : (
            'Welcome back to CampusEats'
          )}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
          Ready for another delivery? Request fresh meals from your favorite campus
          restaurants or track active orders in real time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-panel-strong gradient-border relative overflow-hidden p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-aurora text-background shadow-glow-sm">
              <Package className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Request a delivery
              </h2>
              <p className="text-sm text-muted-foreground">
                Schedule campus-to-campus deliveries in minutes.
              </p>
            </div>
          </div>
          <Button asChild className="btn-aurora mt-6 w-full rounded-full font-semibold">
            <Link href="/request-delivery">
              Start a new request
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="glass-panel p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-secondary ring-1 ring-inset ring-white/10">
              <Truck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Track deliveries
              </h2>
              <p className="text-sm text-muted-foreground">
                Follow real-time progress and revisit your order history.
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="mt-6 w-full rounded-full border-white/15 bg-white/[0.03] text-foreground hover:bg-white/[0.07] hover:text-foreground"
          >
            <Link href="/track-package">
              View my deliveries
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </PageShell>
);

const AdminHome = ({ profile }: { profile: UserProfile }) => (
  <PageShell>
    <div className="mx-auto max-w-6xl space-y-8">
      <AdminCatalogHealthBanner />

      <div className="space-y-4 text-center">
        <span className="eyebrow">
          <Sparkles className="h-3.5 w-3.5" />
          Operations command center
        </span>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
          Welcome back, <span className="gradient-text">{profile.firstName}</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
          Monitor the autonomous fleet, advance bot statuses, and keep deliveries
          flowing across campus. Customer ordering is disabled on operations accounts.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-panel-strong gradient-border relative overflow-hidden p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-aurora text-background shadow-glow-sm">
              <Activity className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Fleet operations
              </h2>
              <p className="text-sm text-muted-foreground">
                Live status, location, battery, and current assignment for every robot.
              </p>
            </div>
          </div>
          <Button asChild className="btn-aurora mt-6 w-full rounded-full font-semibold">
            <Link href="/operations">
              Open operations console
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="glass-panel p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-secondary ring-1 ring-inset ring-white/10">
              <PlugZap className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Operations checklist
              </h2>
              <p className="text-sm text-muted-foreground">
                Keep heartbeats fresh, batteries healthy, and stuck orders unblocked.
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 text-sm text-foreground/90">
            {[
              'Watch for bots stuck in OFFLINE longer than expected.',
              'Send low-battery bots to CHARGING before the next dispatch.',
              'Flag bots in MAINTENANCE so dispatch skips them.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </PageShell>
);

const AuthenticatedHome = ({ profile }: { profile: UserProfile | null }) => {
  if (profile?.role === 'RESTAURANT') {
    return <RestaurantHome profile={profile} />;
  }

  if (profile?.role === 'ADMIN') {
    return <AdminHome profile={profile} />;
  }

  return <UserHome profile={profile} />;
};

export const HomeContent = () => {
  const { user, isLoading } = useSupabaseAuth();
  const { profile, isLoading: profileLoading } = useCurrentProfile();

  // Show marketing page immediately if no user (don't wait for auth to finish)
  // This makes the page feel instant for non-authenticated users
  if (!user) {
    return <MarketingHero />;
  }

  if (isLoading || profileLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-aurora opacity-60 blur-md" />
        </div>
      </div>
    );
  }

  return <AuthenticatedHome profile={profile} />;
};
