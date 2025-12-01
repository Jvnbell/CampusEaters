'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ForgotPasswordCard } from '@/components/auth/ForgotPasswordCard';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { supabase } = useSupabaseAuth();

  useEffect(() => {
    // Check if we have a password recovery token in the URL
    // If Supabase redirected here with a token, redirect to reset-password
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const hasRecoveryToken = hash && (hash.includes('access_token') || hash.includes('type=recovery'));
    
    if (hasRecoveryToken) {
      // Redirect to reset-password with the token
      // Use window.location for full URL with hash since Next.js router doesn't handle hash fragments
      window.location.href = `/reset-password${window.location.hash}`;
      return;
    }

    // Also check if we have a session from password recovery
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User has a session, might be from password recovery
        // Check the URL to see if we should redirect
        const currentUrl = window.location.href;
        if (currentUrl.includes('type=recovery') || hash.includes('type=recovery')) {
          router.push('/reset-password');
        }
      }
    };
    
    checkSession();
  }, [router, supabase]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950/80 px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white">Reset Your Password</h1>
          <p className="text-sm text-slate-400">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        <ForgotPasswordCard />
      </div>
    </div>
  );
}

