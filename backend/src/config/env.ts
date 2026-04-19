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
  const port = Number(process.env.PORT);
  return {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    JWT_SECRET: process.env.JWT_SECRET ?? '',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? '',
    TMDB_API_KEY: process.env.TMDB_API_KEY ?? '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
    PORT: Number.isFinite(port) && port > 0 ? port : 3000,
  };
}
