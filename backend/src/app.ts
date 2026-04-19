import cors from 'cors';
import express from 'express';
import { registerV1Routes } from './routes/api/v1/index.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp(): express.Express {
  const app = express();
  const rawOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowList = rawOrigins.length
    ? rawOrigins
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
      ];
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowList.includes(origin)) return cb(null, true);
        if (process.env.NODE_ENV !== 'production') return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );
  // app.use(helmetMiddleware);
  // app.use(apiRateLimiter);
  app.use(express.json());
  registerV1Routes(app);
  app.use(errorHandler);
  return app;
}
