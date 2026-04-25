export interface Vote {
  id: string;
  sessionId: string;
  userId: string;
  movieTmdbId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteResult {
  movieTmdbId: number;
  voteCount: number;
}

export function castVote(
  groupId: string,
  sessionId: string,
  userId: string,
  movieTmdbId: number
): Promise<Vote> {
  return Promise.resolve({} as Vote); // TODO
}

export function getResults(
  groupId: string,
  sessionId: string
): Promise<VoteResult[]> {
  return Promise.resolve([]); // TODO
}

export function getMyVote(
  groupId: string,
  sessionId: string,
  userId: string
): Promise<Vote | null> {
  return Promise.resolve(null); // TODO
}
