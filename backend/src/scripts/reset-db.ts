import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getPrisma } from '../config/database.js';

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  const prisma = getPrisma();

  await prisma.vote.deleteMany();
  await prisma.session.deleteMany();
  await prisma.groupInvite.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.watchedEntry.deleteMany();
  await prisma.watchlistEntry.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.movieCatalogEntry.deleteMany();
  await prisma.user.deleteMany();

  const seeds = [
    {
      email: 'admin@movienight.local',
      displayName: 'Admin',
      password: 'password',
      systemRole: 'SYSTEM_ADMIN' as const,
      favoriteGenres: ['Documentary', 'Drama'],
    },
    {
      email: 'mi@movienight.local',
      displayName: 'Mi',
      password: 'mi12345',
      systemRole: 'USER' as const,
      favoriteGenres: ['Comedy', 'Romance'],
    },
    {
      email: 'xavier@movienight.local',
      displayName: 'Xavier',
      password: 'xavier12345',
      systemRole: 'USER' as const,
      favoriteGenres: ['Drama', 'Sci-Fi'],
    },
  ];

  for (const [index, seed] of seeds.entries()) {
    const passwordHash = await bcrypt.hash(seed.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        displayName: seed.displayName,
        passwordHash,
        systemRole: seed.systemRole,
        numericId: index + 1,
      },
    });
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        favoriteGenres: seed.favoriteGenres,
      },
    });
  }

  console.log('MongoDB reset complete. Seeded users: admin, mi, xavier');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
