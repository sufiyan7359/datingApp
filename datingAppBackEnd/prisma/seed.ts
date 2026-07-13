import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.promoCode.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: { code: 'WELCOME20', discountPercent: 20, isActive: true },
  });
  await prisma.promoCode.upsert({
    where: { code: 'LAUNCH50' },
    update: {},
    create: {
      code: 'LAUNCH50',
      discountPercent: 50,
      maxRedemptions: 100,
      isActive: true,
    },
  });

  // Promote an existing account to admin: ADMIN_EMAIL=you@example.com npm run prisma:seed
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const user = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!user) {
      console.warn(`ADMIN_EMAIL "${adminEmail}" does not match any existing account - register it first, then re-run the seed.`);
    } else {
      await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });
      console.log(`Promoted ${adminEmail} to ADMIN.`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
