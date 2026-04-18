/**
 * App-level enum unions and DB row shapes. These replace the previous
 * `@prisma/client` imports throughout the codebase.
 */

export type AccountRole = 'USER' | 'ADMIN' | 'RESTAURANT';
export type OrderStatus = 'SENT' | 'RECEIVED' | 'SHIPPING' | 'DELIVERED';

// ---------------------------------------------------------------------------
// Snake_case rows that match the Postgres schema in
// supabase/migrations/0001_drop_prisma.sql.
// ---------------------------------------------------------------------------

export type RestaurantRow = {
  id: string;
  name: string;
  location: string;
  created_at: string;
  updated_at: string;
};

export type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  restaurant_id: string | null;
  role: AccountRole;
  created_at: string;
  updated_at: string;
};

export type MenuItemRow = {
  id: string;
  name: string;
  price: string | number;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
};

export type BotRow = {
  id: string;
  primary_location: string;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  order_number: number;
  user_id: string;
  restaurant_id: string;
  bot_id: string | null;
  delivery_location: string;
  status: OrderStatus;
  placed_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Camel-case shapes returned by API routes. React components rely on these
// (firstName, restaurantId, placedAt, orderItems[].menuItem.name, …).
// ---------------------------------------------------------------------------

export type AuthProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AccountRole;
  restaurantId: string | null;
};

export type UserProfile = AuthProfile & {
  phoneNumber: string | null;
};

export type MenuItemSummary = {
  id: string;
  name: string;
  price: string;
};

export type RestaurantWithMenu = {
  id: string;
  name: string;
  location: string;
  menuItems: MenuItemSummary[];
};

export type OrderItemWithMenu = {
  id: string;
  quantity: number;
  menuItem: {
    name: string;
    price: string;
  };
};

export type OrderRestaurantSummary = {
  name: string;
  location: string;
};

export type OrderUserSummary = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type OrderBotSummary = {
  id: string;
  primaryLocation: string;
};

export type Order = {
  id: string;
  orderNumber: number;
  userId: string;
  restaurantId: string;
  botId: string | null;
  deliveryLocation: string;
  status: OrderStatus;
  placedAt: string;
  updatedAt: string;
};

export type OrderWithRelations = Order & {
  restaurant: OrderRestaurantSummary;
  orderItems: OrderItemWithMenu[];
  user?: OrderUserSummary;
  bot?: OrderBotSummary | null;
};

// ---------------------------------------------------------------------------
// Minimal Database typing for `createClient<Database>()`. We type only the
// surfaces the app actually uses; anything else falls back to `unknown`.
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: RestaurantRow;
        Insert: Partial<RestaurantRow> & Pick<RestaurantRow, 'name' | 'location'>;
        Update: Partial<RestaurantRow>;
      };
      users: {
        Row: UserRow;
        Insert: Partial<UserRow> & Pick<UserRow, 'first_name' | 'last_name' | 'email'>;
        Update: Partial<UserRow>;
      };
      menu_items: {
        Row: MenuItemRow;
        Insert: Partial<MenuItemRow> & Pick<MenuItemRow, 'name' | 'price' | 'restaurant_id'>;
        Update: Partial<MenuItemRow>;
      };
      bots: {
        Row: BotRow;
        Insert: Partial<BotRow> & Pick<BotRow, 'primary_location'>;
        Update: Partial<BotRow>;
      };
      orders: {
        Row: OrderRow;
        Insert: Partial<OrderRow> &
          Pick<OrderRow, 'user_id' | 'restaurant_id' | 'delivery_location'>;
        Update: Partial<OrderRow>;
      };
      order_items: {
        Row: OrderItemRow;
        Insert: Partial<OrderItemRow> & Pick<OrderItemRow, 'order_id' | 'menu_item_id'>;
        Update: Partial<OrderItemRow>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order: {
        Args: {
          p_user_id: string;
          p_restaurant_id: string;
          p_delivery_location: string;
          p_items: Array<{ menu_item_id: string; quantity: number }>;
        };
        Returns: {
          id: string;
          order_number: number;
          user_id: string;
          restaurant_id: string;
          bot_id: string | null;
          delivery_location: string;
          status: OrderStatus;
          placed_at: string;
          updated_at: string;
        };
      };
    };
    Enums: {
      account_role: AccountRole;
      order_status: OrderStatus;
    };
  };
};
