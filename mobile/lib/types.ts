/**
 * Mirrors the user-facing slice of /website/src/types/db.ts.
 * Restaurant + operations-only shapes are intentionally omitted — the mobile
 * app is for end-users only.
 */

export type OrderStatus = 'SENT' | 'RECEIVED' | 'SHIPPING' | 'DELIVERED';

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN' | 'RESTAURANT';
  restaurantId: string | null;
  phoneNumber: string | null;
};

export type MenuItemSummary = {
  id: string;
  name: string;
  price: string;
};

export type RestaurantWithMenuAndRating = {
  id: string;
  name: string;
  location: string;
  menuItems: MenuItemSummary[];
  averageRating: number;
  reviewCount: number;
};

export type Review = {
  id: string;
  orderId: string;
  userId: string;
  restaurantId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  reviewer?: {
    firstName: string;
    lastName: string;
  };
};

export type OrderItemWithMenu = {
  id: string;
  quantity: number;
  menuItem: {
    name: string;
    price: string;
  };
};

export type OrderWithRelations = {
  id: string;
  orderNumber: number;
  userId: string;
  restaurantId: string;
  botId: string | null;
  deliveryLocation: string;
  status: OrderStatus;
  placedAt: string;
  updatedAt: string;
  restaurant: { name: string; location: string };
  orderItems: OrderItemWithMenu[];
  bot?: { id: string; name?: string; primaryLocation: string } | null;
};

export type CartLine = {
  menuItem: MenuItemSummary;
  quantity: number;
};
