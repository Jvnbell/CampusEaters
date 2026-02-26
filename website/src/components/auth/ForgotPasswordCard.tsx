'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

export const ForgotPasswordCard = () => {
  const { supabase } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setIsSent(true);
      toast.success('Password reset link sent! Check your email.');
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to send password reset email. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle>Check Your Email</CardTitle>
          </div>
          <CardDescription>We&apos;ve sent a password reset link to {email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the link in the email to reset your password. The link will expire in 1 hour.
          </p>
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or try again.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsSent(false);
                setEmail('');
              }}
              className="w-full"
            >
              Send Another Email
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">Back to Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle>Forgot Password</CardTitle>
        </div>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@ut.edu"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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
  );
};

