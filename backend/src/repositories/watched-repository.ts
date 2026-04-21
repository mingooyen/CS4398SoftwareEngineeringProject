import { getPrisma } from '../config/database.js';

const MAX_RATED_MOVIES = 10;

export async function upsertRating(userId: string, tmdbId: number, rating: number): Promise<void> {
  const prisma = getPrisma();
  const now = new Date();

  await prisma.watchedEntry.upsert({
    where: {
      userId_tmdbId: { userId, tmdbId },
    },
    create: {
      userId,
      tmdbId,
      rating,
      watchedAt: now,
    },
    update: {
      rating,
      watchedAt: now,
    },
  });

  const rated = await prisma.watchedEntry.findMany({
    where: { userId, rating: { not: null } },
    orderBy: { watchedAt: 'asc' },
    select: { id: true },
  });

  if (rated.length > MAX_RATED_MOVIES) {
    const remove = rated.slice(0, rated.length - MAX_RATED_MOVIES);
    await prisma.watchedEntry.deleteMany({
      where: { id: { in: remove.map((r) => r.id) } },
    });
  }
}

export async function listRatingsByUser(userId: string): Promise<{ tmdbId: number; rating: number }[]> {
  const rows = await getPrisma().watchedEntry.findMany({
    where: { userId, rating: { not: null } },
    orderBy: { watchedAt: 'desc' },
    take: MAX_RATED_MOVIES,
    select: { tmdbId: true, rating: true },
  });
  return rows
    .filter((r) => r.rating != null)
    .map((r) => ({ tmdbId: r.tmdbId, rating: r.rating as number }));
}
