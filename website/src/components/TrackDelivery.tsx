'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Order, OrderStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { MapPin, Package, CheckCircle2, Truck, Home, Bot, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

type OrderWithRelations = Order & {
  restaurant: {
    name: string;
    location: string;
  };
  orderItems: Array<{
    id: string;
    quantity: number;
    menuItem: {
      name: string;
      price: string;
    };
  }>;
};

type OrdersResponse = {
  orders: OrderWithRelations[];
};

type TimelineStep = {
  status: OrderStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const timelineSteps: TimelineStep[] = [
  {
    status: 'SENT',
    label: 'Order Received',
    description: 'We’ve received your order and notified the restaurant.',
    icon: CheckCircle2,
  },
  {
    status: 'RECEIVED',
    label: 'Preparing Order',
    description: 'The restaurant is preparing your items.',
    icon: Package,
  },
  {
    status: 'SHIPPING',
    label: 'Out for Delivery',
    description: 'A delivery robot is en route to the drop-off location.',
    icon: Truck,
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    description: 'The delivery has reached the destination.',
    icon: Home,
  },
];

const statusBadgeMap: Record<OrderStatus, string> = {
  SENT: 'bg-amber-500',
  RECEIVED: 'bg-blue-500',
  SHIPPING: 'bg-indigo-500',
  DELIVERED: 'bg-green-600',
};

const statusFriendlyText: Record<OrderStatus, string> = {
  SENT: 'Order Received',
  RECEIVED: 'Preparing',
  SHIPPING: 'Out for Delivery',
  DELIVERED: 'Delivered',
};

const TrackDelivery = () => {
  const { user: authUser, isLoading: authLoading } = useSupabaseAuth();
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'DELIVERED'),
    [orders],
  );
  const pastOrders = useMemo(
    () => orders.filter((order) => order.status === 'DELIVERED'),
    [orders],
  );

  useEffect(() => {
    const fetchOrders = async () => {
      if (authLoading) return;
      if (!authUser?.email) {
        setOrders([]);
        return;
      }

      setIsLoadingOrders(true);

      try {
        const userResponse = await fetch(`/api/users?email=${encodeURIComponent(authUser.email)}`);
        if (!userResponse.ok) {
          throw new Error('Unable to locate your CampusEats profile.');
        }

        const { user } = (await userResponse.json()) as {
          user: { id: string; firstName: string; lastName: string; email: string };
        };

        const ordersResponse = await fetch(`/api/orders?userId=${user.id}`);
        if (!ordersResponse.ok) {
          const body = await ordersResponse.json().catch(() => ({}));
          throw new Error(body.error ?? 'Failed to fetch orders.');
        }

        const { orders: fetchedOrders } = (await ordersResponse.json()) as OrdersResponse;
        setOrders(fetchedOrders);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Unable to load orders.');
        setOrders([]);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [authUser, authLoading]);

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          <CardTitle>Your Deliveries</CardTitle>
        </div>
        <CardDescription>Track active deliveries and browse your past order history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {authLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !authUser ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 text-center text-sm text-amber-200">
            Sign in to see your deliveries and order history.
          </div>
        ) : isLoadingOrders ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-6 text-center">
            <Clock className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            <p className="text-sm text-muted-foreground">
              You don’t have any deliveries yet. Place a new order to get started.
            </p>
            <Button asChild className="mt-4">
              <a href="/request-delivery">Request a Delivery</a>
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Active Deliveries</TabsTrigger>
              <TabsTrigger value="history">Order History</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              {activeOrders.length === 0 ? (
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-6 text-center">
                  <Truck className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                  <p className="text-sm text-muted-foreground">
                    You don’t have any active deliveries right now. Check your history below.
                  </p>
                </div>
              ) : (
                activeOrders.map((order) => {
                  const activeStepIndex = timelineSteps.findIndex((step) => step.status === order.status);
                  const progressValue = (activeStepIndex / (timelineSteps.length - 1)) * 100;
                  const orderTotal = order.orderItems.reduce((sum, item) => {
                    const priceNumber = Number(item.menuItem.price);
                    if (Number.isNaN(priceNumber)) return sum;
                    return sum + priceNumber * item.quantity;
                  }, 0);

                  return (
                    <Card key={order.id} className="border border-slate-800/60 bg-slate-900/40">
                      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracking ID</p>
                          <p className="font-mono text-lg text-white">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Placed on {new Date(order.placedAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={`${statusBadgeMap[order.status]} text-white`}>
                          {statusFriendlyText[order.status]}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">Pickup</h3>
                            <p className="text-sm text-muted-foreground">{order.restaurant.name}</p>
                            <p className="text-sm text-muted-foreground">{order.restaurant.location}</p>
                          </div>
                          <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
                              Delivery Location
                            </h3>
                            <p className="text-sm text-muted-foreground">{order.deliveryLocation}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">Order Items</h3>
                          <div className="mt-3 space-y-2">
                            {order.orderItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm text-white">
                                <span>
                                  {item.menuItem.name}{' '}
                                  <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ${(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-white">
                              Estimated Total
                            </span>
                            <span className="text-sm font-semibold text-white">${orderTotal.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-white">Delivery Progress</h3>
                          <div className="flex items-center gap-3">
                            <Progress value={progressValue} className="h-2 flex-1 bg-slate-800" />
                            <span className="text-xs text-muted-foreground">{Math.round(progressValue)}%</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-white">Timeline</h3>
                          <div className="relative">
                            {timelineSteps.map((step, index) => {
                              if (index === timelineSteps.length - 1) return null;
                              const isCompleted = order.status === 'DELIVERED' || index < activeStepIndex;
                              const isActive = index === activeStepIndex;

                              return (
                                <div
                                  key={`line-${step.status}`}
                                  className={`absolute left-6 w-0.5 transition-colors ${
                                    isCompleted ? 'bg-green-600' : isActive ? 'bg-blue-500' : 'bg-slate-800'
                                  }`}
                                  style={{
                                    top: `${index * 96 + 48}px`,
                                    height: '96px',
                                    zIndex: 0,
                                  }}
                                />
                              );
                            })}

                            {timelineSteps.map((step, index) => {
                              const IconComponent = step.icon;
                              const isCompleted = order.status === 'DELIVERED' || timelineSteps.findIndex((s) => s.status === order.status) > index;
                              const isActive = timelineSteps.findIndex((s) => s.status === order.status) === index;

                              return (
                                <div
                                  key={step.status}
                                  className={`relative flex items-start gap-4 mb-8 last:mb-0 ${
                                    isActive ? 'bg-blue-500/10 rounded-lg p-4 -mx-4 border-2 border-blue-500/50' : ''
                                  }`}
                                >
                                  <div className="relative z-10">
                                    <div
                                      className={`relative flex h-12 w-12 items-center justify-center rounded-full ${
                                        isCompleted
                                          ? 'bg-green-600 text-white shadow-lg shadow-green-600/50'
                                          : isActive
                                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                                          : 'bg-slate-800 text-slate-400'
                                      } ${isActive ? 'animate-pulse' : ''}`}
                                    >
                                      <IconComponent className="h-6 w-6" />
                                    </div>
                                    {isActive && (
                                      <>
                                        <div className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping" />
                                        <div className="absolute -inset-2 rounded-full border-2 border-blue-400/50 animate-pulse" />
                                      </>
                                    )}
                                  </div>

                                  <div className="flex-1 pt-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <p
                                          className={`font-semibold text-base ${
                                            isCompleted
                                              ? 'text-green-500'
                                              : isActive
                                              ? 'text-blue-400'
                                              : 'text-slate-400'
                                          }`}
                                        >
                                          {step.label}
                                        </p>
                                        {isActive && (
                                          <Badge className="bg-blue-500 text-white text-xs animate-pulse">
                                            CURRENT
                                          </Badge>
                                        )}
                                        {isCompleted && !isActive && (
                                          <Badge className="bg-green-600 text-white text-xs">COMPLETE</Badge>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {index === 0
                                          ? new Date(order.placedAt).toLocaleTimeString()
                                          : index === timelineSteps.length - 1 && order.status === 'DELIVERED'
                                          ? new Date(order.updatedAt).toLocaleTimeString()
                                          : ''}
                                      </span>
                                    </div>
                                    <p
                                      className={`text-sm mt-1 ${
                                        isCompleted
                                          ? 'text-green-500/80'
                                          : isActive
                                          ? 'text-blue-300'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {step.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">Support</h3>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Need help with this order? Contact{' '}
                            <a href="mailto:support@campuseats.com" className="text-primary underline-offset-4 hover:underline">
                              support@campuseats.com
                            </a>{' '}
                            and reference tracking ID{' '}
                            <span className="font-medium text-white">{order.orderNumber}</span>.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              {pastOrders.length === 0 ? (
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-6 text-center">
                  <Bot className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                  <p className="text-sm text-muted-foreground">
                    You haven’t completed any deliveries yet. Once orders are delivered they’ll appear here.
                  </p>
                </div>
              ) : (
                pastOrders.map((order) => {
                  const orderTotal = order.orderItems.reduce((sum, item) => {
                    const priceNumber = Number(item.menuItem.price);
                    if (Number.isNaN(priceNumber)) return sum;
                    return sum + priceNumber * item.quantity;
                  }, 0);

                  return (
                    <Card key={order.id} className="border border-slate-800/60 bg-slate-900/40">
                      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracking ID</p>
                          <p className="font-mono text-lg text-white">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Delivered on {new Date(order.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge className="bg-green-600 text-white">Delivered</Badge>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">Pickup</h3>
                            <p className="text-sm text-muted-foreground">{order.restaurant.name}</p>
                            <p className="text-sm text-muted-foreground">{order.restaurant.location}</p>
                          </div>
                          <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
                              Delivery Location
                            </h3>
                            <p className="text-sm text-muted-foreground">{order.deliveryLocation}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">Order Summary</h3>
                          <div className="mt-3 space-y-2">
                            {order.orderItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm text-white">
                                <span>
                                  {item.menuItem.name}{' '}
                                  <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ${(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-white">
                              Total Paid
                            </span>
                            <span className="text-sm font-semibold text-white">${orderTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackDelivery;
