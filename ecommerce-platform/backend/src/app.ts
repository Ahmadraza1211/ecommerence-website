import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiLimiter, loginLimiter, adminLoginLimiter } from './middleware/rateLimiter';
import routes from './routes';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server) or from allowed origins
      if (!origin || origin.includes('localhost') || origin.includes('vercel.app') || origin === env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(null, true); // Allow for now in production to avoid CORS blocks
      }
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Serverless DB connection middleware
  app.use(async (_req, _res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/admin/login', adminLoginLimiter);

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
