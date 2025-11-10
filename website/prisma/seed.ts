import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  await prisma.menuItem.deleteMany();
  await prisma.restaurant.deleteMany();

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


