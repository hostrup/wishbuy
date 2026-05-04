import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.transaction.count();
  console.log(`Total transactions: ${total}`);

  const totalCategories = await prisma.transactionCategory.count();
  console.log(`Total transaction categories: ${totalCategories}`);

  const totalItemCategories = await prisma.category.count();
  console.log(`Total item categories: ${totalItemCategories}`);

  const tCats = await prisma.transactionCategory.findMany({ select: { name: true }});
  const iCats = await prisma.category.findMany({ select: { name: true }});

  console.log('\nTransaction Categories:');
  console.log(tCats.map(c => c.name).join(', '));

  console.log('\nItem (Wish) Categories:');
  console.log(iCats.map(c => c.name).join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());
