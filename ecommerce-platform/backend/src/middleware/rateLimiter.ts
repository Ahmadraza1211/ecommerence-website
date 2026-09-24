import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const loginLimiter = rateLimit({
  windowMs: env.LOGIN_LOCK_MINUTES * 60 * 1000,
  max: env.LOGIN_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: `Too many login attempts. Please try again in ${env.LOGIN_LOCK_MINUTES} minutes.` },
});

export const adminLoginLimiter = rateLimit({
  windowMs: env.LOGIN_LOCK_MINUTES * 60 * 1000,
  max: env.LOGIN_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: `Too many login attempts. Please try again in ${env.LOGIN_LOCK_MINUTES} minutes.` },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

