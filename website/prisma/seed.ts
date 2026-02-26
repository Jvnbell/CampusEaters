import { Prisma, PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

// Use direct connection for seeding - bypasses Prisma Accelerate when it can't
// reach the database. Set DIRECT_URL in .env to your Supabase direct connection
// string (port 5432). Get it from Supabase Dashboard → Settings → Database.
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  throw new Error('DIRECT_URL or DATABASE_URL must be set in .env');
}

// Force binary engine for direct DB connection (Accelerate/dataproxy uses prisma:// URLs)
const originalEngine = process.env.PRISMA_CLIENT_ENGINE_TYPE;
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } },
});

// Restore original for any downstream code
if (originalEngine !== undefined) process.env.PRISMA_CLIENT_ENGINE_TYPE = originalEngine;

const USER_COUNT = 10_000;
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

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.restaurant.deleteMany();

  // Seed 10k users in batches
  console.log(`Seeding ${USER_COUNT} users...`);
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
    await prisma.$disconnect();
    process.exit(1);
  });


