'use client';

import { useMemo, useState } from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { allowedDomains, isAllowedEmail } from '@/lib/auth';

type AuthMode = 'signIn' | 'signUp';

type AuthCopy = {
  titles: {
    signIn: string;
    signUp: string;
  };
  descriptions: {
    signIn: string;
    signUp: string;
  };
  signedIn: {
    title: string;
    body: string;
  };
  cardDescription?: string;
  emptyState?: {
    headingIcon?: 'shield' | 'shieldCheck';
  };
};

type AuthCardVariant = 'default' | 'admin';

const copyByVariant: Record<AuthCardVariant, AuthCopy> = {
  default: {
    titles: {
      signIn: 'Sign in to CampusEats',
      signUp: 'Create your CampusEats account',
    },
    descriptions: {
      signIn: 'Enter your campus email to access delivery services.',
      signUp: 'Use your authorized campus email to get started.',
    },
    signedIn: {
      title: 'You are signed in',
      body: 'Use the navigation above to request deliveries or manage your account.',
    },
    cardDescription: 'Only campus staff and students with authorized emails can access protected features.',
    emptyState: {
      headingIcon: 'shield',
    },
  },
  admin: {
    titles: {
      signIn: 'Admin Login',
      signUp: 'Create your admin account',
    },
    descriptions: {
      signIn: 'Sign in to access the admin dashboard.',
      signUp: 'Use your authorized campus email address to create an admin account.',
    },
    signedIn: {
      title: 'Welcome back',
      body: 'You now have access to secure areas of the admin dashboard. Sign out when you are done.',
    },
    cardDescription: 'Secure authentication for authorized personnel',
    emptyState: {
      headingIcon: 'shield',
    },
  },
};

type AuthCardProps = {
  variant?: AuthCardVariant;
  defaultMode?: AuthMode;
  className?: string;
  redirectPath?: string;
};

export const AuthCard = ({ variant = 'default', defaultMode = 'signIn', className, redirectPath = '/' }: AuthCardProps) => {
  const { supabase, user, isLoading } = useSupabaseAuth();
  const [authMode, setAuthMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = useMemo(() => copyByVariant[variant], [variant]);

  const handleSignOut = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.signOut();
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setEmail('');
    setPassword('');
    toast.success('Signed out successfully.');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    if (!isAllowedEmail(email)) {
      toast.error('Please use your UT or Spartans UT email address.');
      return;
    }

    setIsSubmitting(true);

    if (authMode === 'signUp') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`,
        },
      });

      setIsSubmitting(false);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Check your inbox to confirm your email address before signing in.');
      setAuthMode('signIn');
      setPassword('');

      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Signed in successfully.');
  };

  const toggleAuthMode = () => {
    setAuthMode((mode) => (mode === 'signIn' ? 'signUp' : 'signIn'));
  };

  const HeadingIcon = copy.emptyState?.headingIcon === 'shieldCheck' ? ShieldCheck : Shield;

  if (isLoading) {
    return (
      <Card className={className ?? 'mx-auto w-full max-w-md'}>
        <CardHeader>
          <div className="mb-2 h-6 w-32 animate-pulse rounded-lg bg-muted" />
          <CardDescription>
            <span className="inline-block h-4 w-48 animate-pulse rounded bg-muted" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (user) {
    return (
      <Card className={className ?? 'mx-auto w-full max-w-md'}>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>{copy.signedIn.title}</CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{copy.signedIn.body}</p>
          <Button onClick={handleSignOut} className="w-full" disabled={isSubmitting}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className ?? 'mx-auto w-full max-w-md'}>
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <HeadingIcon className="h-6 w-6 text-primary" />
          <CardTitle>{authMode === 'signIn' ? copy.titles.signIn : copy.titles.signUp}</CardTitle>
        </div>
        <CardDescription>
          {authMode === 'signIn' ? copy.descriptions.signIn : copy.descriptions.signUp}
        </CardDescription>
        {copy.cardDescription ? (
          <p className="text-sm text-muted-foreground">{copy.cardDescription}</p>
        ) : null}
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

          <div className="space-y-2">
            <Label htmlFor="password">{authMode === 'signIn' ? 'Password' : 'Create a password'}</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : authMode === 'signIn' ? 'Sign in' : 'Sign up'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {authMode === 'signIn' ? "Don't have an account yet?" : 'Already registered?'}{' '}
            <button
              type="button"
              onClick={toggleAuthMode}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {authMode === 'signIn' ? 'Create one' : 'Switch to sign in'}
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            Only {allowedDomains.map((domain) => `@${domain}`).join(' or ')} email addresses are permitted.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export type { AuthMode };


