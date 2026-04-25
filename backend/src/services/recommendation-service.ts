import { getPrisma } from '../config/database.js';
import * as groupMemberRepository from '../repositories/group-member-repository.js';
import * as movieCatalogRepository from '../repositories/movie-catalog-repository.js';
import { catalogEntryToJson } from './movie-service.js';

export async function getRecommendationsForGroup(groupId: string) {
  const members = await groupMemberRepository.findByGroup(groupId);
  const userIds = members.map((m) => m.userId);
  const prisma = getPrisma();
  const prefs = await prisma.userPreferences.findMany({
    where: { userId: { in: userIds } },
  });
  const genreSet = new Set<string>();
  for (const p of prefs) {
    for (const g of p.favoriteGenres) {
      genreSet.add(g.trim().toLowerCase());
    }
  }
  const catalog = await movieCatalogRepository.findManyOrdered();
  const scored = catalog.map((entry) => {
    const g = entry.genre?.trim().toLowerCase() ?? '';
    let score = 0;
    if (genreSet.size === 0) {
      score = 1;
    } else {
      for (const gv of genreSet) {
        if (!g) continue;
        if (g === gv || g.includes(gv) || gv.includes(g)) {
          score += 2;
          break;
        }
      }
    }
    return { entry, score };
  });
  scored.sort((a, b) => b.score - a.score || b.entry.title.localeCompare(a.entry.title));
  const memberGenreUnion = [...new Set([...genreSet])];
  return {
    recommendations: scored.map((s) => ({
      ...catalogEntryToJson(s.entry),
      matchScore: s.score,
    })),
    memberGenreUnion,
  };
}
