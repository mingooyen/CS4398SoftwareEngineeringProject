import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getPrisma } from '../config/database.js';

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  const email =
    (process.env.SET_PASSWORD_EMAIL ?? process.argv[2] ?? '').trim().toLowerCase();
  const password = process.env.SET_PASSWORD ?? process.argv[3] ?? '';

  if (!email || !password) {
    console.error(
      'Set a user password in the database (bcrypt).\n\n' +
        '  npm run db:set-password -- you@example.com "your-new-password"\n\n' +
        'Or (avoids shell history for the password):\n' +
        '  set SET_PASSWORD_EMAIL=you@example.com\n' +
        '  set SET_PASSWORD=your-new-password\n' +
        '  npm run db:set-password\n'
    );
    process.exit(1);
  }

  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await prisma.user.updateMany({
    where: { email },
    data: { passwordHash },
  });

  if (result.count === 0) {
    console.error(`No user with email "${email}". Sign up in the app or run npm run db:reset-seed for demo accounts.`);
    process.exit(1);
  }

  console.log(`Password updated for ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
