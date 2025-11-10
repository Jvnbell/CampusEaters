'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Package, Truck } from 'lucide-react';

import { useCurrentProfile } from '@/hooks/use-current-profile';

type OrderStatus = 'SENT' | 'RECEIVED' | 'SHIPPING' | 'DELIVERED';

type RestaurantOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  placedAt: string;
  deliveryLocation: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
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

const STATUS_FLOW: OrderStatus[] = ['SENT', 'RECEIVED', 'SHIPPING', 'DELIVERED'];

const statusLabel: Record<OrderStatus, string> = {
  SENT: 'Order received',
  RECEIVED: 'Preparing',
  SHIPPING: 'Out for delivery',
  DELIVERED: 'Delivered',
};

const statusBadgeClass: Record<OrderStatus, string> = {
  SENT: 'bg-amber-500 text-white',
  RECEIVED: 'bg-blue-500 text-white',
  SHIPPING: 'bg-indigo-500 text-white',
  DELIVERED: 'bg-green-600 text-white',
};

export const RestaurantOrders = () => {
  const { profile, isLoading, error } = useCurrentProfile();
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const restaurantId = profile?.restaurantId ?? null;

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    setIsFetching(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/orders`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to load orders.');
      }
      const data = (await response.json()) as { orders: RestaurantOrder[] };
      setOrders(data.orders);
    } catch (fetchError) {
      console.error(fetchError);
      toast.error(fetchError instanceof Error ? fetchError.message : 'Unable to load orders.');
    } finally {
      setIsFetching(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      fetchOrders();
    }
  }, [restaurantId, fetchOrders]);

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/id/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to update order.');
      }

      toast.success('Order status updated.');
      await fetchOrders();
    } catch (updateError) {
      console.error(updateError);
      toast.error(updateError instanceof Error ? updateError.message : 'Unable to update order.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'DELIVERED'),
    [orders],
  );

  if (isLoading || isFetching) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-500/30 bg-red-500/10">
        <CardHeader>
          <CardTitle className="text-red-100">Unable to load restaurant profile</CardTitle>
          <CardDescription className="text-red-200/80">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-200/80">
            Please contact an administrator to ensure your account is configured correctly.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile || profile.role !== 'RESTAURANT') {
    return (
      <Card className="border border-slate-800/60 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Restaurant access required</CardTitle>
          <CardDescription className="text-slate-300">
            Only restaurant accounts can view and manage orders. Switch to a restaurant account or contact support if you
            believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild variant="outline" className="border-slate-700 text-slate-100">
            <Link href="/">Return to home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!restaurantId) {
    return (
      <Card className="border border-amber-500/30 bg-amber-500/10">
        <CardHeader>
          <CardTitle className="text-amber-100">Restaurant link missing</CardTitle>
          <CardDescription className="text-amber-200/80">
            Your account is marked as a restaurant user, but it isn’t linked to a restaurant record yet. Please contact
            support to complete setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild variant="outline" className="border-amber-400/40 text-amber-100 hover:bg-amber-500/20">
            <Link href="/">Return to home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <Card className="border border-slate-800/60 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            All caught up
          </CardTitle>
          <CardDescription className="text-slate-300">
            There are no active CampusEats orders for your restaurant right now. New orders will appear here instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Truck className="h-12 w-12 text-slate-500" />
          <p className="text-sm text-slate-400">Keep this page open to monitor incoming deliveries in real time.</p>
          <Button onClick={fetchOrders} variant="outline" className="border-slate-700 text-slate-100">
            Refresh orders
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Active orders</h2>
          <p className="text-sm text-slate-400">
            Update order statuses as your kitchen processes requests. Students see these changes in real time.
          </p>
        </div>
        <Button variant="outline" className="border-slate-700 text-slate-100" onClick={fetchOrders}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {activeOrders.map((order) => {
          const currentIndex = STATUS_FLOW.indexOf(order.status);
          const nextStatuses = STATUS_FLOW.filter((status) => STATUS_FLOW.indexOf(status) >= currentIndex);

          const orderTotal = order.orderItems.reduce((sum, item) => {
            const price = Number(item.menuItem.price);
            if (Number.isNaN(price)) return sum;
            return sum + price * item.quantity;
          }, 0);

          return (
            <Card key={order.id} className="border border-slate-800/60 bg-slate-900/70 shadow-lg shadow-blue-500/10">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-800 text-slate-200">#{order.orderNumber}</Badge>
                    <Badge className={statusBadgeClass[order.status]}>{statusLabel[order.status]}</Badge>
                  </div>
                  <CardTitle className="mt-3 text-white">
                    {order.user.firstName} {order.user.lastName}
                  </CardTitle>
                  <CardDescription className="text-slate-300">{order.user.email}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">
                    Placed: <span className="text-slate-200">{new Date(order.placedAt).toLocaleString()}</span>
                  </p>
                  <p className="text-sm text-slate-400">
                    Deliver to: <span className="text-slate-200">{order.deliveryLocation}</span>
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="text-sm font-semibold text-white">Items</h3>
                  <div className="mt-2 space-y-2 text-sm text-slate-200">
                    {order.orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span>
                          {item.menuItem.name} <span className="text-xs text-slate-400">×{item.quantity}</span>
                        </span>
                        <span className="text-xs text-slate-400">
                          ${(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-sm text-slate-300">
                    <span>Total value</span>
                    <span className="font-semibold text-white">${orderTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Update status</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {nextStatuses.map((status) => {
                      const isCurrent = status === order.status;
                      const isCompleted = STATUS_FLOW.indexOf(status) < currentIndex;
                      return (
                        <Button
                          key={status}
                          size="sm"
                          variant={isCurrent ? 'default' : 'outline'}
                          disabled={isCompleted || updatingOrderId === order.id}
                          className={
                            isCurrent
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'border-slate-700 text-slate-100 hover:bg-slate-800/60'
                          }
                          onClick={() => handleStatusUpdate(order.id, status)}
                        >
                          {statusLabel[status]}
                          {isCurrent && <ArrowRight className="ml-2 h-3 w-3" />}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">
                    Move orders through each stage as they are prepared, handed to the robot, and delivered.
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};


