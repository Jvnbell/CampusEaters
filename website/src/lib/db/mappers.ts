/**
 * Shape mappers between snake_case Postgres rows and the camelCase JSON the
 * React components consume. Centralising them here means the API routes stay
 * tiny and the component code keeps working without changes.
 */

import type {
  AuthProfile,
  Bot,
  BotRow,
  BotWithCurrentOrder,
  MenuItemRow,
  MenuItemSummary,
  Order,
  OrderBotSummary,
  OrderItemWithMenu,
  OrderRestaurantSummary,
  OrderRow,
  OrderUserSummary,
  OrderWithRelations,
  RestaurantRatingRow,
  RestaurantWithMenu,
  RestaurantWithMenuAndRating,
  Review,
  ReviewRow,
  UserProfile,
  UserRow,
} from '@/types/db';

/** Money columns can come back as either a string or number depending on driver settings. */
const formatPrice = (price: string | number | null | undefined): string => {
  if (price === null || price === undefined) return '0.00';
  if (typeof price === 'number') return price.toFixed(2);
  return price;
};

const pickFirst = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const toFiniteNumber = (value: string | number | null | undefined, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function mapAuthProfile(row: Pick<UserRow, 'id' | 'email' | 'first_name' | 'last_name' | 'role' | 'restaurant_id'>): AuthProfile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    restaurantId: row.restaurant_id ?? null,
  };
}

export function mapUserProfile(row: UserRow): UserProfile {
  return {
    ...mapAuthProfile(row),
    phoneNumber: row.phone_number ?? null,
  };
}

export function mapMenuItem(row: Pick<MenuItemRow, 'id' | 'name' | 'price'>): MenuItemSummary {
  return {
    id: row.id,
    name: row.name,
    price: formatPrice(row.price),
  };
}

type RestaurantWithMenuRow = {
  id: string;
  name: string;
  location: string;
  menu_items: Array<Pick<MenuItemRow, 'id' | 'name' | 'price'>> | null;
};

export function mapRestaurantWithMenu(row: RestaurantWithMenuRow): RestaurantWithMenu {
  const menu = (row.menu_items ?? []).map(mapMenuItem);
  menu.sort((a, b) => a.name.localeCompare(b.name));
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    menuItems: menu,
  };
}

export function mapRestaurantRating(
  row: Pick<RestaurantRatingRow, 'review_count' | 'average_rating'> | null | undefined,
): { averageRating: number; reviewCount: number } {
  if (!row) return { averageRating: 0, reviewCount: 0 };
  return {
    averageRating: toFiniteNumber(row.average_rating, 0),
    reviewCount: Math.max(0, Math.trunc(toFiniteNumber(row.review_count, 0))),
  };
}

type RestaurantWithRatingRow = RestaurantWithMenuRow & {
  restaurant_ratings?:
    | Pick<RestaurantRatingRow, 'review_count' | 'average_rating'>
    | Array<Pick<RestaurantRatingRow, 'review_count' | 'average_rating'>>
    | null;
};

export function mapRestaurantWithMenuAndRating(
  row: RestaurantWithRatingRow,
): RestaurantWithMenuAndRating {
  const base = mapRestaurantWithMenu(row);
  const ratingRow = pickFirst(row.restaurant_ratings ?? null);
  const { averageRating, reviewCount } = mapRestaurantRating(ratingRow);
  return { ...base, averageRating, reviewCount };
}

type ReviewRowWithReviewer = ReviewRow & {
  reviewer?:
    | Pick<UserRow, 'first_name' | 'last_name'>
    | Array<Pick<UserRow, 'first_name' | 'last_name'>>
    | null;
};

export function mapReview(row: ReviewRowWithReviewer): Review {
  const reviewer = pickFirst(row.reviewer ?? null);
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    rating: row.rating,
    comment: row.comment ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewer: reviewer
      ? { firstName: reviewer.first_name, lastName: reviewer.last_name }
      : undefined,
  };
}

type OrderItemRowWithMenu = {
  id: string;
  quantity: number;
  menu_item:
    | Pick<MenuItemRow, 'name' | 'price'>
    | Array<Pick<MenuItemRow, 'name' | 'price'>>
    | null;
};

export function mapOrderItem(row: OrderItemRowWithMenu): OrderItemWithMenu {
  const menuItem = pickFirst(row.menu_item);
  return {
    id: row.id,
    quantity: row.quantity,
    menuItem: {
      name: menuItem?.name ?? '',
      price: formatPrice(menuItem?.price ?? null),
    },
  };
}

export function mapOrderBase(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    botId: row.bot_id ?? null,
    deliveryLocation: row.delivery_location,
    status: row.status,
    placedAt: row.placed_at,
    updatedAt: row.updated_at,
  };
}

type OrderRowWithRelations = OrderRow & {
  restaurant?:
    | { name: string; location?: string | null }
    | Array<{ name: string; location?: string | null }>
    | null;
  user?:
    | { id?: string; first_name: string; last_name: string; email: string }
    | Array<{ id?: string; first_name: string; last_name: string; email: string }>
    | null;
  bot?:
    | { id: string; name?: string; primary_location: string }
    | Array<{ id: string; name?: string; primary_location: string }>
    | null;
  order_items?: OrderItemRowWithMenu[] | null;
};

export function mapOrderWithRelations(row: OrderRowWithRelations): OrderWithRelations {
  const restaurant = pickFirst(row.restaurant);
  const user = pickFirst(row.user);
  const bot = pickFirst(row.bot);

  const restaurantSummary: OrderRestaurantSummary = {
    name: restaurant?.name ?? '',
    location: restaurant?.location ?? '',
  };

  const userSummary: OrderUserSummary | undefined = user
    ? {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      }
    : undefined;

  const botSummary: OrderBotSummary | null = bot
    ? {
        id: bot.id,
        name: (bot as { name?: string }).name,
        primaryLocation: bot.primary_location,
      }
    : null;

  return {
    ...mapOrderBase(row),
    restaurant: restaurantSummary,
    orderItems: (row.order_items ?? []).map(mapOrderItem),
    user: userSummary,
    bot: botSummary,
  };
}

export function mapBot(row: BotRow): Bot {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    primaryLocation: row.primary_location,
    currentLocation: row.current_location,
    batteryLevel: row.battery_level ?? null,
    lastHeartbeatAt: row.last_heartbeat_at ?? null,
    positionX:
      row.position_x === null || row.position_x === undefined
        ? null
        : toFiniteNumber(row.position_x, 0),
    positionY:
      row.position_y === null || row.position_y === undefined
        ? null
        : toFiniteNumber(row.position_y, 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ActiveOrderForBotRow = {
  id: string;
  order_number: number;
  status: OrderRow['status'];
  delivery_location: string;
  placed_at: string;
  restaurant?:
    | { id: string; name: string; location: string }
    | Array<{ id: string; name: string; location: string }>
    | null;
  user?:
    | { first_name: string; last_name: string; email: string }
    | Array<{ first_name: string; last_name: string; email: string }>
    | null;
};

export function mapBotWithCurrentOrder(
  bot: BotRow,
  activeOrder: ActiveOrderForBotRow | null,
): BotWithCurrentOrder {
  const base = mapBot(bot);
  if (!activeOrder) {
    return { ...base, currentOrder: null };
  }

  const restaurant = pickFirst(activeOrder.restaurant);
  const customer = pickFirst(activeOrder.user);

  return {
    ...base,
    currentOrder: {
      id: activeOrder.id,
      orderNumber: activeOrder.order_number,
      status: activeOrder.status,
      deliveryLocation: activeOrder.delivery_location,
      placedAt: activeOrder.placed_at,
      restaurant: restaurant
        ? { id: restaurant.id, name: restaurant.name, location: restaurant.location }
        : null,
      customer: customer
        ? {
            firstName: customer.first_name,
            lastName: customer.last_name,
            email: customer.email,
          }
        : null,
    },
  };
}
