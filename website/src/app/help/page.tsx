import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  HelpCircle,
  BookOpen,
  ShoppingCart,
  Clock,
  XCircle,
  AlertCircle,
  Users,
  MapPin,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const metadata: Metadata = {
  title: 'Help & Contact | CampusEats',
  description: 'Get help with CampusEats deliveries, contact support, and find answers to common questions.',
};

const faqs = [
  {
    value: 'place-order',
    question: 'How do I place an order?',
    icon: ShoppingCart,
    accent: 'text-secondary',
    answer:
      'Sign in with your UT email address, then go to "Request Delivery" to select a restaurant and menu items. Fill in your delivery location and submit your order. You\'ll receive email confirmations as your order progresses.',
  },
  {
    value: 'delivery-time',
    question: 'How long does delivery take?',
    icon: Clock,
    accent: 'text-secondary',
    answer:
      'Delivery times vary based on restaurant preparation time and campus location. Most deliveries are completed within 15–30 minutes from when the order is placed. You can track your order in real-time on the "Track Package" page.',
  },
  {
    value: 'cancel-order',
    question: 'Can I cancel or modify my order?',
    icon: XCircle,
    accent: 'text-warning',
    answer:
      'Orders can be cancelled or modified before the restaurant begins preparation. Once an order status changes to "Preparing" or later, modifications may not be possible. Contact support immediately if you need to make changes.',
  },
  {
    value: 'incorrect-order',
    question: 'What if my order is incorrect or missing items?',
    icon: AlertCircle,
    accent: 'text-destructive',
    answer:
      'If your order is incorrect or missing items, please contact support immediately with your order number. We\'ll work with the restaurant to resolve the issue and ensure you receive the correct items or a refund.',
  },
  {
    value: 'who-can-use',
    question: 'Who can use CampusEats?',
    icon: Users,
    accent: 'text-success',
    answer:
      'CampusEats is available to all University of Tampa students, faculty, and staff with a valid @ut.edu or @spartans.ut.edu email address. Sign up with your campus email to get started.',
  },
  {
    value: 'track-delivery',
    question: 'How do I track my delivery?',
    icon: MapPin,
    accent: 'text-accent',
    answer:
      'After placing an order, go to the "Track Package" page to see real-time updates on your delivery status. You\'ll also receive email notifications when your order status changes.',
  },
];

export default function HelpPage() {
  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-15 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
        >
          <Link href="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>

      <main className="container mx-auto px-4 pb-20 pt-6">
        <div className="mx-auto max-w-4xl space-y-12">
          <div className="space-y-4 text-center">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Help center
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground text-balance md:text-5xl">
              Help &amp; <span className="gradient-text">contact</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
              Need assistance? We&apos;re here to help with your CampusEats delivery
              questions and support requests.
            </p>
          </div>

          <Card className="glass-panel-strong border-0 p-1">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-aurora text-background shadow-glow-sm">
                  <Mail className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <CardTitle>Email support</CardTitle>
              </div>
              <CardDescription>
                Send us an email and we&apos;ll get back to you within 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                For order issues, account questions, or general inquiries, email us at:
              </p>
              <Button asChild className="btn-aurora w-full rounded-full font-semibold">
                <a href="mailto:support@campuseats.com">Contact support</a>
              </Button>
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-6 flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
              <HelpCircle className="h-6 w-6 text-secondary" />
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map(({ value, question, icon: Icon, accent, answer }) => (
                <AccordionItem
                  key={value}
                  value={value}
                  className="glass-panel border-0 px-5 transition-all hover:border-white/20"
                >
                  <AccordionTrigger className="text-left text-foreground hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 shrink-0 ${accent}`} />
                      <span className="font-semibold">{question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 pl-8 pt-2 text-sm text-muted-foreground">
                    {answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <section>
            <h2 className="mb-6 flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
              <BookOpen className="h-6 w-6 text-secondary" />
              Additional resources
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-panel border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Account issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Having trouble signing in or managing your account? Try resetting
                    your password or contact support for assistance.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-full sm:w-auto"
                    >
                      <Link href="/forgot-password">Reset password</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-full sm:w-auto"
                    >
                      <Link href="/login">Sign in</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Restaurant partners</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Are you a restaurant interested in partnering with CampusEats?
                    We&apos;d love to hear from you.
                  </p>
                  <Button asChild variant="outline" className="w-full rounded-full">
                    <a href="mailto:partners@campuseats.com">Contact partnerships</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          <Card className="glass-panel-strong gradient-border relative overflow-hidden border-0">
            <CardHeader>
              <CardTitle className="text-lg">Still need help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Our support team is available to assist you. Reach out via email and
                we&apos;ll respond as soon as possible.
              </p>
              <Button asChild className="btn-aurora w-full rounded-full font-semibold">
                <a href="mailto:support@campuseats.com">Contact support</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
