import type { RecommendationItem } from './ai/types.js';

export interface RecommendationOptions {
  limit?: number;
  excludeTmdbIds?: number[];
}

export function getGroupRecommendations(
  groupId: string,
  options?: RecommendationOptions
): Promise<RecommendationItem[]> {
  return Promise.resolve([]); // TODO: load members, watched/ratings, call recommendation-engine
}
