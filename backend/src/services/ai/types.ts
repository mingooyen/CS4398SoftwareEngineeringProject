export interface RecommendationInput {
  userIds: string[];
  limit?: number;
  excludeTmdbIds?: number[];
}

export interface RecommendationItem {
  tmdbId: number;
  title: string;
  score: number;
  explanation: string;
}

export interface RecommendationOutput {
  items: RecommendationItem[];
}
