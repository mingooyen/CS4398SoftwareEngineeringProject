import type { RecommendationInput, RecommendationOutput } from './types.js';

export async function generateRecommendations(
  input: RecommendationInput
): Promise<RecommendationOutput> {
  // TODO: call OpenAI with group context; prioritize unwatched-by-all; return score + explanation
  return { items: [] };
}
