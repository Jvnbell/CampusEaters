import { Prisma, PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

/**
 * Seeding must use a normal Postgres connection string (`postgresql://` or `postgres://`).
 * Prisma Accelerate URLs (`prisma+postgres://`) do not work for `prisma db seed`.
 *
 * In `.env`, set `DIRECT_URL` to the value from Supabase → Project Settings → Database:
 *   - "URI" under Connection string (direct), or Session pooler on port 5432.
 * Leave `DATABASE_URL` as your Accelerate URL for the Next.js app.
 */
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  throw new Error('Set DIRECT_URL or DATABASE_URL in website/.env');
}

if (directUrl.startsWith('prisma+') || directUrl.startsWith('prisma://')) {
  throw new Error(
    'DATABASE_URL points to Prisma Accelerate, which cannot run prisma db seed.\n' +
      'Add DIRECT_URL to website/.env with your Supabase Postgres URI (postgresql://… from the Supabase dashboard).',
  );
}

// Force binary engine for direct DB connection (Accelerate/dataproxy uses prisma:// URLs)
const originalEngine = process.env.PRISMA_CLIENT_ENGINE_TYPE;
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } },
});

// Restore original for any downstream code
if (originalEngine !== undefined) process.env.PRISMA_CLIENT_ENGINE_TYPE = originalEngine;

/** Set to 0 to seed only restaurants + menu items (fast). Default 10_000 for full demo data. */
const USER_COUNT = Math.max(0, Number.parseInt(process.env.SEED_USER_COUNT ?? '10000', 10));
const BATCH_SIZE = 1_000;

const restaurantsData = [
  {
    name: 'Chick-fil-A',
    location: 'University of Tampa - Spartan Shops',
    menuItems: [
      { name: 'Original Chicken Sandwich', price: '5.29' },
      { name: 'Chick-n-Strips (3 count)', price: '4.75' },
      { name: 'Spicy Chicken Deluxe Sandwich', price: '6.25' },
      { name: 'Freshly Brewed Iced Tea (Sweet)', price: '1.99' },
      { name: 'Chick-fil-A Lemonade', price: '2.49' },
    ],
  },
  {
    name: 'Aussie Grill',
    location: 'University of Tampa - Food Court',
    menuItems: [
      { name: 'Crispy Chicken Sandwich', price: '7.49' },
      { name: 'BBQ Brisket Sandwich', price: '8.99' },
      { name: 'Grilled Chicken Caesar Wrap', price: '7.75' },
      { name: 'House-Made Lemonade', price: '2.25' },
      { name: 'Bottled Spring Water', price: '1.75' },
    ],
  },
];

function printConnectionHelp() {
  console.error(`
Could not reach Postgres. Check:

  1. Supabase Dashboard → project is not paused. Restore if needed.
  2. DIRECT_URL: Supabase "Direct" (db.*.supabase.co:5432) is IPv6-only — many networks get P1001.
     Use Session pooler instead: Dashboard → Connect → "Session mode" and copy the URI.
     It looks like: postgres://postgres.[PROJECT-REF]:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
  3. If your pooler region is not us-east-1, replace aws-0-us-east-1 with the region shown in that Connect string.
  4. Password must match Database Settings; add ?sslmode=require if missing.

Quick catalog-only seed after fixing the URL:
  SEED_USER_COUNT=0 npx prisma db seed
`);
}

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.restaurant.deleteMany();

  if (USER_COUNT > 0) {
    console.log(`Seeding ${USER_COUNT} users (set SEED_USER_COUNT=0 to skip)...`);
    for (let i = 0; i < USER_COUNT; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, USER_COUNT - i);
      const users = Array.from({ length: batchSize }, (_, j) => {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        return {
          firstName,
          lastName,
          email: `user${i + j}@campuseaters.example.com`,
          phoneNumber: faker.helpers.maybe(() => faker.phone.number(), { probability: 0.7 }) ?? null,
          role: 'USER' as const,
        };
      });
      await prisma.user.createMany({ data: users });
      console.log(`  Created users ${i + 1}-${i + batchSize}`);
    }
    console.log(`✓ Seeded ${USER_COUNT} users`);
  } else {
    console.log('Skipping bulk users (SEED_USER_COUNT=0).');
  }

  for (const restaurant of restaurantsData) {
    await prisma.restaurant.create({
      data: {
        name: restaurant.name,
        location: restaurant.location,
        menuItems: {
          create: restaurant.menuItems.map((item) => ({
            name: item.name,
            price: new Prisma.Decimal(item.price),
          })),
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Error seeding database:', error);
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("Can't reach database server") ||
      message.includes('P1001') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT')
    ) {
      printConnectionHelp();
    }
    await prisma.$disconnect();
    process.exit(1);
  });


