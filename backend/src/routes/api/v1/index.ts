import type { Express } from 'express';
import authRoutes from './auth-routes.js';
import userRoutes from './user-routes.js';
import movieRoutes from './movie-routes.js';
import groupRoutes from './group-routes.js';

export function registerV1Routes(app: Express): void {
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/movies', movieRoutes);
  app.use('/api/v1/groups', groupRoutes);
}
