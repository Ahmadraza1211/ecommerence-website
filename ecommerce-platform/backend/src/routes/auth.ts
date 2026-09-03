import { Router, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { User } from '../models/User';
import { Cart } from '../models/Cart';
import { Wishlist } from '../models/Wishlist';
import { authenticate, AuthenticatedRequest, signAccessToken, signRefreshToken, verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { env } from '../config/env';
import { hashPassword, comparePassword } from '../utils/auth';

const router = Router();

// POST /auth/register — buyer only (no self-service seller signup)
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  validate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, phone } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      const passwordHash = await hashPassword(password);
      const user = await User.create({
        name,
        email,
        phone: phone || '',
        passwordHash,
        role: 'BUYER',
      });
      await Cart.create({ userId: user._id, items: [] });
      await Wishlist.create({ userId: user._id, productIds: [] });

      const payload = { id: String(user._id), role: user.role, email: user.email };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      res.cookie(env.JWT_REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.status(201).json({
        user: { id: String(user._id), name: user.name, email: user.email, role: user.role, phone: user.phone },
        accessToken,
      });
    } catch (e) { next(e); }
  }
);

// POST /auth/login — BUYER login only (rejects ADMIN credentials)
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 })],
  validate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      // Role-restriction: this endpoint is for BUYER accounts only
      if (user.role !== 'BUYER') {
        return res.status(403).json({ error: 'Please use the admin login page for seller accounts' });
      }
      if (user.lockUntil && user.lockUntil > new Date()) {
        return res.status(429).json({ error: 'Too many failed attempts. Please try again later.' });
      }
      const ok = await comparePassword(password, user.passwordHash);
      if (!ok) {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const lockUntil = attempts >= env.LOGIN_MAX_ATTEMPTS
          ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60 * 1000)
          : undefined;
        await User.updateOne({ _id: user._id }, { failedLoginAttempts: attempts, $set: { lockUntil: lockUntil || null } });
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, lockUntil: null });
      const payload = { id: String(user._id), role: user.role, email: user.email };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      res.cookie(env.JWT_REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.json({
        user: { id: String(user._id), name: user.name, email: user.email, role: user.role, phone: user.phone, avatarUrl: user.avatarUrl },
        accessToken,
      });
    } catch (e) { next(e); }
  }
);

// POST /auth/admin/login — ADMIN only (rejects BUYER credentials)
router.post(
  '/admin/login',
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 })],
  validate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || user.role !== 'ADMIN') {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
      const ok = await comparePassword(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
      const payload = { id: String(user._id), role: user.role, email: user.email };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      res.cookie(env.JWT_REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.json({
        user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
        accessToken,
      });
    } catch (e) { next(e); }
  }
);

// POST /auth/refresh
router.post('/refresh', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[env.JWT_REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Session expired, please sign in again', code: 'NO_REFRESH' });
    let payload: { id: string; role: 'BUYER' | 'ADMIN'; email: string };
    try {
      payload = verifyToken<typeof payload>(token);
    } catch (err: any) {
      res.clearCookie(env.JWT_REFRESH_COOKIE_NAME);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired, please sign in again', code: 'REFRESH_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid session', code: 'REFRESH_INVALID' });
    }
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'User no longer exists', code: 'USER_GONE' });
    if (user.role !== payload.role) {
      return res.status(401).json({ error: 'Session outdated, please sign in again', code: 'ROLE_CHANGED' });
    }
    const newPayload = { id: String(user._id), role: user.role, email: user.email };
    const accessToken = signAccessToken(newPayload);
    return res.json({ accessToken });
  } catch (e) { next(e); }
});

// POST /auth/logout
router.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  res.clearCookie(env.JWT_REFRESH_COOKIE_NAME);
  return res.json({ ok: true });
});

// GET /auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    return res.json({ user });
  } catch (e) { next(e); }
});

// PATCH /auth/me — update profile
router.patch('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, avatarUrl } = req.body;
    const update: any = {};
    if (name) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    const user = await User.findByIdAndUpdate(req.user!.id, { $set: update }, { new: true }).select('-passwordHash');
    return res.json({ user });
  } catch (e) { next(e); }
});

export default router;
