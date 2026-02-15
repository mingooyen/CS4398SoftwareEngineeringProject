import express from 'express';
import { registerV1Routes } from './routes/api/v1/index.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp(): express.Express {
  const app = express();
  // app.use(helmetMiddleware);
  // app.use(corsMiddleware);
  // app.use(apiRateLimiter);
  app.use(express.json());
  registerV1Routes(app);
  app.use(errorHandler);
  return app;
}
