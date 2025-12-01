'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

const roleByVariant: Record<AuthCardVariant, 'USER' | 'ADMIN' | 'RESTAURANT'> = {
  default: 'USER',
  admin: 'ADMIN',
};

type AuthCardProps = {
  variant?: AuthCardVariant;
  defaultMode?: AuthMode;
  className?: string;
  redirectPath?: string;
};

export const AuthCard = ({ variant = 'default', defaultMode = 'signIn', className, redirectPath = '/' }: AuthCardProps) => {
  const router = useRouter();
  const { supabase, user, isLoading } = useSupabaseAuth();
  const [authMode, setAuthMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    toast.success('Signed out successfully.');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    if (authMode === 'signUp') {
      if (!isAllowedEmail(email)) {
        toast.error('Please use your UT or Spartans UT email address.');
        setIsSubmitting(false);
        return;
      }

      if (!firstName.trim() || !lastName.trim()) {
        toast.error('Please provide your first and last name.');
        setIsSubmitting(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`,
        },
      });

      if (signUpError) {
      setIsSubmitting(false);
        toast.error(signUpError.message);
        return;
      }

      try {
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const requestBody = {
          email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          role: roleByVariant[variant],
        };

        console.log('[AuthCard] Attempting to create profile:', { email, firstName: firstName.trim(), lastName: lastName.trim() });
        
        const profileResponse = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('[AuthCard] Profile response status:', profileResponse.status);

        if (!profileResponse.ok) {
          const body = await profileResponse.json().catch(() => ({}));
          // Combine error and details for better user feedback
          let errorMsg = body.error || `Failed to create profile (${profileResponse.status}).`;
          if (body.details) {
            errorMsg += ` ${body.details}`;
          }
          if (body.hint) {
            errorMsg += ` ${body.hint}`;
          }
          console.error('[AuthCard] API error response:', { status: profileResponse.status, body });
          throw new Error(errorMsg);
        }
        
        const result = await profileResponse.json();
        console.log('[AuthCard] Profile created successfully:', result.user?.id);
      } catch (profileError) {
        setIsSubmitting(false);
        
        console.error('[AuthCard] Profile creation error details:', {
          error: profileError,
          name: profileError instanceof Error ? profileError.name : 'Unknown',
          message: profileError instanceof Error ? profileError.message : String(profileError),
          stack: profileError instanceof Error ? profileError.stack : undefined,
        });
        
        let errorMessage = 'Account created but there was an issue creating your profile. Please contact support.';
        
        if (profileError instanceof Error) {
          if (profileError.name === 'AbortError') {
            errorMessage = 'Request timed out. Please try again.';
          } else if (profileError.message === 'Failed to fetch' || profileError instanceof TypeError) {
            errorMessage = 'Unable to connect to the server. Please make sure the server is running and try again.';
          } else if (profileError.message.includes('timeout')) {
            errorMessage = 'The request took too long. Please try again.';
          } else {
            errorMessage = profileError.message;
          }
        } else if (profileError instanceof TypeError) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        toast.error(errorMessage);
        return;
      }

      setIsSubmitting(false);

      toast.success('Check your inbox to confirm your email address before signing in.');
      setAuthMode('signIn');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhoneNumber('');

      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsSubmitting(false);
      toast.error(error.message);
      return;
    }

    try {
      const profileResponse = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
      if (!profileResponse.ok) {
        const body = await profileResponse.json().catch(() => ({}));
        throw new Error(body.error ?? 'Unable to load profile.');
      }
      const { user: profile } = (await profileResponse.json()) as {
        user: {
          role: 'USER' | 'ADMIN' | 'RESTAURANT';
          restaurantId?: string | null;
        };
      };

      toast.success('Signed in successfully.');

      if (profile.role === 'RESTAURANT' && profile.restaurantId) {
        router.push('/restaurant/orders');
      } else {
        router.push(redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`);
      }
      router.refresh();
    } catch (profileError) {
      toast.success('Signed in successfully.');
      toast.error(
        profileError instanceof Error
          ? profileError.message
          : 'Signed in, but we could not load your profile. Please refresh the page.',
      );
      router.push(redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
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
          {authMode === 'signUp' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="Your first name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Your last name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phoneNumber">Phone number (optional)</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 123-4567"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                />
              </div>
            </div>
          )}

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
            <div className="flex items-center justify-between">
            <Label htmlFor="password">{authMode === 'signIn' ? 'Password' : 'Create a password'}</Label>
              {authMode === 'signIn' && (
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>
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
            {authMode === 'signUp'
              ? `Only ${allowedDomains.map((domain) => `@${domain}`).join(' or ')} email addresses are permitted when creating a new account.`
              : 'Sign in with the email associated with your account.'}
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export type { AuthMode };


