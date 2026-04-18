/**
 * Shape mappers between snake_case Postgres rows and the camelCase JSON the
 * React components consume. Centralising them here means the API routes stay
 * tiny and the component code keeps working without changes.
 */

import type {
  AuthProfile,
  MenuItemRow,
  MenuItemSummary,
  Order,
  OrderBotSummary,
  OrderItemWithMenu,
  OrderRestaurantSummary,
  OrderRow,
  OrderUserSummary,
  OrderWithRelations,
  RestaurantWithMenu,
  UserProfile,
  UserRow,
} from '@/types/db';

/** Money columns can come back as either a string or number depending on driver settings. */
const formatPrice = (price: string | number | null | undefined): string => {
  if (price === null || price === undefined) return '0.00';
  if (typeof price === 'number') return price.toFixed(2);
  return price;
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

type OrderItemRowWithMenu = {
  id: string;
  quantity: number;
  menu_item:
    | Pick<MenuItemRow, 'name' | 'price'>
    | Array<Pick<MenuItemRow, 'name' | 'price'>>
    | null;
};

const pickFirst = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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
    | { id: string; primary_location: string }
    | Array<{ id: string; primary_location: string }>
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
    ? { id: bot.id, primaryLocation: bot.primary_location }
    : null;

  return {
    ...mapOrderBase(row),
    restaurant: restaurantSummary,
    orderItems: (row.order_items ?? []).map(mapOrderItem),
    user: userSummary,
    bot: botSummary,
  };
}
