import Link from 'next/link';

export const SiteFooter = () => {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950/80 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <p className="text-sm text-slate-500">
              © 2024 CampusEats · UTampa Autonomous Delivery Initiative
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/help"
              className="text-sm text-slate-400 transition hover:text-slate-200 hover:underline"
            >
              Help & Contact
            </Link>
            <a
              href="mailto:support@campuseats.com"
              className="text-sm text-slate-400 transition hover:text-slate-200 hover:underline"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

