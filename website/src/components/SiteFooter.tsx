import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export const SiteFooter = () => {
  return (
    <footer className="relative mt-auto border-t border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-aurora text-background shadow-glow-sm">
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div>
              <p className="font-display text-sm font-semibold tracking-tight text-foreground">
                CampusEats
              </p>
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} · UTampa Autonomous Delivery Initiative
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link
              href="/help"
              className="transition-colors hover:text-foreground"
            >
              Help &amp; Contact
            </Link>
            <a
              href="mailto:support@campuseats.com"
              className="transition-colors hover:text-foreground"
            >
              Support
            </a>
            <a
              href="mailto:partners@campuseats.com"
              className="transition-colors hover:text-foreground"
            >
              Restaurant partners
            </a>
            <span className="hidden text-muted-foreground/40 md:inline">·</span>
            <span className="text-xs text-muted-foreground/70">
              Made with care at the University of Tampa
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
