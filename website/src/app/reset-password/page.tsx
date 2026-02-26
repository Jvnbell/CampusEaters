'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { supabase } = useSupabaseAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Check if we're on the reset password page with a token
    const checkForToken = () => {
      const hash = window.location.hash;
      const hasToken = hash && (hash.includes('access_token') || hash.includes('type=recovery'));
      
      console.log('[Reset Password] URL hash:', hash);
      console.log('[Reset Password] Has token:', hasToken);
      
      return hasToken;
    };

    // Listen for auth state changes (Supabase processes the token and creates a session)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Reset Password] Auth state change:', event, 'Session:', !!session);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[Reset Password] PASSWORD_RECOVERY event detected');
        if (mounted) {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session) {
        // User signed in via password recovery
        console.log('[Reset Password] User signed in via recovery');
        if (mounted) {
          setIsLoading(false);
        }
      } else if (!session && !checkForToken()) {
        // Only redirect if there's no token in URL and no session
        // Give it more time for Supabase to process
        console.log('[Reset Password] No session and no token detected');
      }
    });

    // Check session after delays to allow Supabase to process the token
    const checkSession = async () => {
      // First check after 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!mounted) return;
      
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('[Reset Password] First check - Session:', !!session, 'Error:', error);
      
      if (session) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }
      
      // If no session, check for token in URL
      if (checkForToken()) {
        console.log('[Reset Password] Token found in URL, waiting for Supabase to process...');
        // Wait longer for Supabase to process
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        if (!mounted) return;
        
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        console.log('[Reset Password] Second check - Session:', !!retrySession);
        
        if (retrySession) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
      }
      
      // Final check - if still no session and no token, show error but don't redirect
      if (!checkForToken() && !session) {
        console.log('[Reset Password] No valid token or session found');
        if (mounted) {
          setIsLoading(false);
          // Show error but let user stay on page
        }
      } else if (mounted) {
        // Session found or token processing
        setIsLoading(false);
      }
    };

    timeoutId = setTimeout(checkSession, 500);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Please enter both password fields.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Verify we have a valid session (Supabase should have processed the token)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Invalid or expired reset link. Please request a new password reset.');
      }

      // Update the password - Supabase requires a valid session from the reset token
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      toast.success('Password reset successfully! You can now sign in with your new password.');
      
      // Sign out the temporary session and redirect to login
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to reset password. The link may have expired. Please request a new one.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if we have a token in the URL
  const hasTokenInUrl = typeof window !== 'undefined' && 
    window.location.hash && 
    (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery'));

  if (isLoading && !hasTokenInUrl) {
    // If loading and no token, show error message
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950/80 px-4 py-16">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle>Invalid Reset Link</CardTitle>
            </div>
            <CardDescription>
              The password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please request a new password reset link from the forgot password page.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/forgot-password">Request New Reset Link</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950/80 px-4 py-16">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <div className="mb-2 h-6 w-32 animate-pulse rounded-lg bg-muted" />
            <CardDescription>
              <span className="inline-block h-4 w-48 animate-pulse rounded bg-muted" />
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950/80 px-4 py-16">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle>Reset Your Password</CardTitle>
          </div>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your new password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

