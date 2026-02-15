export interface Env {
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  TMDB_API_KEY: string;
  OPENAI_API_KEY: string;
  PORT: number;
}

export function getEnv(): Env {
  // TODO: validate with zod and load from process.env
  return {} as Env;
}
