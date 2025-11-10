'use client';

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

type RestaurantOption = {
  id: string;
  name: string;
  location: string;
  menuItems: Array<{
    id: string;
    name: string;
    price: string;
  }>;
};

type UserOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type SelectedItemsState = Record<string, number>;

const DeliveryRequest = () => {
  const { user: authUser, isLoading: authLoading } = useSupabaseAuth();
  const [restaurantId, setRestaurantId] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [currentUser, setCurrentUser] = useState<UserOption | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItemsState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const restaurantsResponse = await fetch('/api/restaurants');

        if (!restaurantsResponse.ok) {
          throw new Error('Failed to load restaurants');
        }

        const restaurantsData = (await restaurantsResponse.json()) as {
          restaurants: RestaurantOption[];
        };

        if (isMounted) {
          setRestaurants(restaurantsData.restaurants);
        }
      } catch (error) {
        console.error(error);
        toast.error('Unable to load restaurants. Please try again.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      if (!authUser?.email) {
        setCurrentUser(null);
        return;
      }

      try {
        const response = await fetch(`/api/users?email=${encodeURIComponent(authUser.email)}`);
        if (!response.ok) {
          throw new Error('Unable to find user profile');
        }

        const data = (await response.json()) as { user: UserOption };
        if (isMounted) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error(error);
        toast.error('Unable to load your profile. Please contact support.');
        if (isMounted) {
          setCurrentUser(null);
        }
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [authUser]);

  useEffect(() => {
    // Reset selections when restaurant changes
    setSelectedItems({});
  }, [restaurantId]);

  const currentRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === restaurantId),
    [restaurants, restaurantId],
  );

  const toggleMenuItem = (menuItemId: string) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[menuItemId]) {
        delete next[menuItemId];
      } else {
        next[menuItemId] = 1;
      }
      return next;
    });
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [menuItemId]: Math.max(1, quantity),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser) {
      toast.error('We could not determine the current user. Please sign in again.');
      return;
    }

    if (!restaurantId || !deliveryLocation.trim() || Object.keys(selectedItems).length === 0) {
      toast.error('Please select a restaurant, delivery location, and at least one menu item.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId,
          userId: currentUser.id,
          deliveryLocation,
          items: Object.entries(selectedItems).map(([menuItemId, quantity]) => ({
            menuItemId,
            quantity,
          })),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error ?? 'Failed to submit order');
      }

      toast.success('Delivery request submitted! Your order has been placed.');
      setRestaurantId('');
      setDeliveryLocation('');
      setSelectedItems({});
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <CardTitle>New Delivery Request</CardTitle>
        </div>
        <CardDescription>Select a restaurant and menu items to dispatch a delivery.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!authUser && !authLoading ? (
            <Card className="border border-amber-500/30 bg-amber-500/10">
              <CardContent className="py-4">
                <p className="text-sm text-amber-200">
                  Please sign in to request a delivery. Your account is required to place orders.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {authLoading ? (
            <p className="text-sm text-muted-foreground">Checking your account…</p>
          ) : authUser && !currentUser ? (
            <p className="text-sm text-amber-200">
              We couldn’t find a matching CampusEats profile for {authUser.email}. Please contact an administrator.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="pickupLocation">Restaurant Pickup Location *</Label>
            <Select
              value={restaurantId}
              onValueChange={setRestaurantId}
              disabled={isLoading || restaurants.length === 0}
              required
            >
              <SelectTrigger id="pickupLocation" aria-label="Choose a restaurant pickup location">
                <SelectValue
                  placeholder={isLoading ? 'Loading restaurants…' : 'Select a campus restaurant'}
                />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={restaurant.id}>
                    <span className="flex flex-col">
                      <span className="font-medium">{restaurant.name}</span>
                      <span className="text-xs text-muted-foreground">{restaurant.location}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryLocation">Delivery Location *</Label>
            <Input
              id="deliveryLocation"
              placeholder="Enter delivery address"
              value={deliveryLocation}
              onChange={(event) => setDeliveryLocation(event.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Delivery location info is currently for dispatch reference only.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Menu Items *</Label>
            {restaurantId === '' ? (
              <p className="text-sm text-muted-foreground">Select a restaurant to view available items.</p>
            ) : currentRestaurant && currentRestaurant.menuItems.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-slate-800/60 bg-slate-900/40 p-4">
                {currentRestaurant.menuItems.map((item) => {
                  const isSelected = Boolean(selectedItems[item.id]);
                  const quantity = selectedItems[item.id] ?? 1;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-md border border-transparent bg-slate-900/60 p-3 transition hover:border-slate-700/80 md:flex-row md:items-center md:justify-between"
                    >
                      <label className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMenuItem(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                        <span>
                          <span className="font-medium text-slate-100">{item.name}</span>
                          <span className="ml-2 text-sm text-slate-400">${item.price}</span>
                        </span>
                      </label>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`quantity-${item.id}`} className="text-xs text-muted-foreground">
                            Qty
                          </Label>
                          <Input
                            id={`quantity-${item.id}`}
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
                            className="h-9 w-20"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No menu items found for this restaurant.</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              isLoading ||
              isSubmitting ||
              !restaurantId ||
              !currentUser ||
              Object.keys(selectedItems).length === 0
            }
          >
            {isSubmitting ? 'Submitting…' : 'Place Delivery Order'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DeliveryRequest;
