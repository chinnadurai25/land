import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fullName = process.env.ADMIN_BOOTSTRAP_NAME?.trim();
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const phone = process.env.ADMIN_BOOTSTRAP_PHONE?.trim() || '+91 98421 00001';

  if (!fullName || !email || !password) {
    console.error(
      'Missing required environment variables: ADMIN_BOOTSTRAP_NAME, ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('ADMIN_BOOTSTRAP_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      phone,
      passwordHash,
      role: 'ADMIN',
      accountStatus: 'APPROVED',
      accountReviewNote: null,
    },
    create: {
      fullName,
      email,
      phone,
      passwordHash,
      role: 'ADMIN',
      accountStatus: 'APPROVED',
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });

  console.log(`Administrator account ready: ${admin.email} (role: ${admin.role})`);
}

main()
  .catch((err) => {
    console.error('Admin bootstrap failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
