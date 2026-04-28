import { getPrisma } from '../config/database.js';

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
}

export async function listRatingsByUser(userId: string): Promise<{ tmdbId: number; rating: number }[]> {
  const rows = await getPrisma().watchedEntry.findMany({
    where: { userId, rating: { not: null } },
    orderBy: { watchedAt: 'desc' },
    select: { tmdbId: true, rating: true },
  });
  return rows
    .filter((r) => r.rating != null)
    .map((r) => ({ tmdbId: r.tmdbId, rating: r.rating as number }));
}
