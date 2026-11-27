import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './lib/errors.js';
import { attachSessionUser, csrfProtection } from './middleware/auth.js';
import { authRouter } from './routes/auth.routes.js';
import { propertiesRouter } from './routes/properties.routes.js';
import { inquiriesRouter } from './routes/inquiries.routes.js';
import { favoritesRouter } from './routes/favorites.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { getLocalUploadRoot } from './services/storage.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  const allowedOrigins = env.FRONTEND_URL.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      skip: () => process.env.NODE_ENV === 'test',
    })
  );

  if (env.STORAGE_DRIVER === 'local' && env.NODE_ENV !== 'production') {
    app.use('/api/v1/media', express.static(getLocalUploadRoot()));
  }

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'landnest-api' });
  });

  app.use(attachSessionUser);
  app.use('/api/v1', csrfProtection);

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1', propertiesRouter);
  app.use('/api/v1', inquiriesRouter);
  app.use('/api/v1', favoritesRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use(errorHandler);
  return app;
}
