import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, HelpCircle, BookOpen, ShoppingCart, Clock, XCircle, AlertCircle, Users, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const metadata: Metadata = {
  title: 'Help & Contact | CampusEats',
  description: 'Get help with CampusEats deliveries, contact support, and find answers to common questions.',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <Button
              asChild
              variant="ghost"
              className="mb-6 text-slate-300 transition hover:bg-slate-800/50 hover:text-white"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-4xl font-bold text-transparent md:text-5xl bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text">
              Help & Contact
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              Need assistance? We're here to help with your CampusEats delivery questions and support requests.
            </p>
          </div>

          <div className="mb-12">
            <Card className="border border-slate-800/60 bg-slate-900/60">
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Mail className="h-6 w-6 text-blue-400" />
                  <CardTitle className="text-white">Email Support</CardTitle>
                </div>
                <CardDescription>Send us an email and we'll get back to you within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-slate-300">
                  For order issues, account questions, or general inquiries, email us at:
                </p>
                <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
                  <a href="mailto:support@campuseats.com">Contact Support</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-white flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-blue-400" />
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full space-y-3">
              <AccordionItem
                value="place-order"
                className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 transition-all hover:border-blue-500/30 hover:bg-slate-900/80"
              >
                <AccordionTrigger className="text-left text-white hover:no-underline">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5 text-blue-400 shrink-0" />
                    <span className="font-semibold">How do I place an order?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 pt-2 pb-4 pl-8">
                  Sign in with your UT email address, then go to "Request Delivery" to select a restaurant and menu
                  items. Fill in your delivery location and submit your order. You'll receive email confirmations as
                  your order progresses.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="delivery-time"
                className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 transition-all hover:border-blue-500/30 hover:bg-slate-900/80"
              >
                <AccordionTrigger className="text-left text-white hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-cyan-400 shrink-0" />
                    <span className="font-semibold">How long does delivery take?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 pt-2 pb-4 pl-8">
                  Delivery times vary based on restaurant preparation time and campus location. Most deliveries are
                  completed within 15-30 minutes from when the order is placed. You can track your order in real-time
                  on the "Track Package" page.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="cancel-order"
                className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 transition-all hover:border-blue-500/30 hover:bg-slate-900/80"
              >
                <AccordionTrigger className="text-left text-white hover:no-underline">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-amber-400 shrink-0" />
                    <span className="font-semibold">Can I cancel or modify my order?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 pt-2 pb-4 pl-8">
                  Orders can be cancelled or modified before the restaurant begins preparation. Once an order status
                  changes to "Preparing" or later, modifications may not be possible. Contact support immediately if
                  you need to make changes.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="incorrect-order"
                className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 transition-all hover:border-blue-500/30 hover:bg-slate-900/80"
              >
                <AccordionTrigger className="text-left text-white hover:no-underline">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                    <span className="font-semibold">What if my order is incorrect or missing items?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 pt-2 pb-4 pl-8">
                  If your order is incorrect or missing items, please contact support immediately with your order
                  number. We'll work with the restaurant to resolve the issue and ensure you receive the correct items
                  or a refund.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="who-can-use"
                className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 transition-all hover:border-blue-500/30 hover:bg-slate-900/80"
              >
                <AccordionTrigger className="text-left text-white hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-green-400 shrink-0" />
                    <span className="font-semibold">Who can use CampusEats?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 pt-2 pb-4 pl-8">
                  CampusEats is available to all University of Tampa students, faculty, and staff with a valid
                  @ut.edu or @spartans.ut.edu email address. Sign up with your campus email to get started.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="track-delivery"
                className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 transition-all hover:border-blue-500/30 hover:bg-slate-900/80"
              >
                <AccordionTrigger className="text-left text-white hover:no-underline">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-purple-400 shrink-0" />
                    <span className="font-semibold">How do I track my delivery?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 pt-2 pb-4 pl-8">
                  After placing an order, go to the "Track Package" page to see real-time updates on your delivery
                  status. You'll also receive email notifications when your order status changes.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-white flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-cyan-400" />
              Additional Resources
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border border-slate-800/60 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Account Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-slate-300">
                    Having trouble signing in or managing your account? Try resetting your password or contact support for
                    assistance.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild className="w-full sm:w-auto bg-slate-800 text-white hover:bg-slate-700 border border-slate-700">
                      <Link href="/forgot-password">Reset Password</Link>
                    </Button>
                    <Button asChild className="w-full sm:w-auto bg-slate-800 text-white hover:bg-slate-700 border border-slate-700">
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-800/60 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Restaurant Partners</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-slate-300">
                    Are you a restaurant interested in partnering with CampusEats? We'd love to hear from you.
                  </p>
                  <Button
                    asChild
                    className="w-full bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
                  >
                    <a href="mailto:partners@campuseats.com">Contact Partnerships</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border border-blue-500/30 bg-blue-500/10">
            <CardHeader>
              <CardTitle className="text-lg text-white">Still Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-blue-100/80">
                Our support team is available to assist you. Reach out via email and we'll respond as soon as possible.
              </p>
              <Button asChild className="w-full bg-blue-500 hover:bg-blue-600">
                <a href="mailto:support@campuseats.com">Contact Support</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

