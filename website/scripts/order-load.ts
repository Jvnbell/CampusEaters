/**
 * Load script: creates 100 orders per minute for 10 minutes (1000 orders total)
 * and mocks restaurant fulfillment by advancing order statuses over time.
 *
 * Run from website/: npx tsx scripts/order-load.ts
 * Requires DIRECT_URL or DATABASE_URL in .env
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const ORDERS_PER_MINUTE = 100;
const DURATION_MINUTES = 10;
const FULFILLMENT_BATCH = 100;

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  throw new Error('DIRECT_URL or DATABASE_URL must be set in .env');
}

const originalEngine = process.env.PRISMA_CLIENT_ENGINE_TYPE;
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } },
});

if (originalEngine !== undefined) process.env.PRISMA_CLIENT_ENGINE_TYPE = originalEngine;

type RestaurantWithMenu = {
  id: string;
  name: string;
  menuItems: { id: string }[];
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

async function getNextOrderNumber(): Promise<number> {
  const agg = await prisma.order.aggregate({ _max: { orderNumber: true } });
  return (agg._max.orderNumber ?? 1000) + 1;
}

async function createOrder(
  orderNumber: number,
  restaurant: RestaurantWithMenu,
  userId: string
): Promise<void> {
  const numItems = 1 + Math.floor(Math.random() * Math.min(3, restaurant.menuItems.length));
  const menuItems = pickN(restaurant.menuItems, numItems);
  const deliveryLocation = faker.location.streetAddress({ useFullAddress: true });

  await prisma.order.create({
    data: {
      orderNumber,
      restaurantId: restaurant.id,
      userId,
      deliveryLocation,
      orderItems: {
        create: menuItems.map((mi) => ({
          menuItemId: mi.id,
          quantity: 1 + Math.floor(Math.random() * 2),
        })),
      },
    },
  });
}

async function advanceFulfillment(): Promise<void> {
  // SENT -> RECEIVED
  const sent = await prisma.order.findMany({
    where: { status: 'SENT' },
    orderBy: { placedAt: 'asc' },
    take: FULFILLMENT_BATCH,
    select: { id: true },
  });
  if (sent.length) {
    await prisma.order.updateMany({
      where: { id: { in: sent.map((o) => o.id) } },
      data: { status: 'RECEIVED' },
    });
    console.log(`  Fulfillment: ${sent.length} SENT → RECEIVED`);
  }

  // RECEIVED -> SHIPPING
  const received = await prisma.order.findMany({
    where: { status: 'RECEIVED' },
    orderBy: { placedAt: 'asc' },
    take: FULFILLMENT_BATCH,
    select: { id: true },
  });
  if (received.length) {
    await prisma.order.updateMany({
      where: { id: { in: received.map((o) => o.id) } },
      data: { status: 'SHIPPING' },
    });
    console.log(`  Fulfillment: ${received.length} RECEIVED → SHIPPING`);
  }

  // SHIPPING -> DELIVERED
  const shipping = await prisma.order.findMany({
    where: { status: 'SHIPPING' },
    orderBy: { placedAt: 'asc' },
    take: FULFILLMENT_BATCH,
    select: { id: true },
  });
  if (shipping.length) {
    await prisma.order.updateMany({
      where: { id: { in: shipping.map((o) => o.id) } },
      data: { status: 'DELIVERED' },
    });
    console.log(`  Fulfillment: ${shipping.length} SHIPPING → DELIVERED`);
  }
}

async function main(): Promise<void> {
  const restaurants = await prisma.restaurant.findMany({
    include: { menuItems: { select: { id: true } } },
  });
  if (!restaurants.length) {
    throw new Error('No restaurants found. Run prisma:seed first.');
  }

  const userIds = await prisma.user.findMany({ select: { id: true } }).then((u) => u.map((x) => x.id));
  if (!userIds.length) {
    throw new Error('No users found. Run prisma:seed first.');
  }

  console.log(`Restaurants: ${restaurants.length}, Users: ${userIds.length}`);
  console.log(`Creating ${ORDERS_PER_MINUTE} orders/minute for ${DURATION_MINUTES} minutes (${ORDERS_PER_MINUTE * DURATION_MINUTES} total).\n`);

  let nextOrderNumber = await getNextOrderNumber();

  for (let minute = 0; minute < DURATION_MINUTES; minute++) {
    const minuteStart = Date.now();
    console.log(`--- Minute ${minute + 1}/${DURATION_MINUTES} ---`);

    // Create 100 orders
    for (let i = 0; i < ORDERS_PER_MINUTE; i++) {
      const restaurant = pick(restaurants) as RestaurantWithMenu;
      const userId = pick(userIds);
      await createOrder(nextOrderNumber, restaurant, userId);
      nextOrderNumber++;
    }
    console.log(`  Created orders ${nextOrderNumber - ORDERS_PER_MINUTE}–${nextOrderNumber - 1}`);

    // Mock fulfillment: advance statuses for previous orders
    await advanceFulfillment();

    const elapsed = Date.now() - minuteStart;
    const wait = Math.max(0, 60_000 - elapsed);
    if (wait > 0 && minute < DURATION_MINUTES - 1) {
      console.log(`  Waiting ${(wait / 1000).toFixed(1)}s until next minute...\n`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  const counts = await prisma.order.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  console.log('\nDone. Order counts by status:');
  counts.forEach((c) => console.log(`  ${c.status}: ${c._count.id}`));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
