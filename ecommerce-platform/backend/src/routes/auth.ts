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

const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@shopwave.demo').toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function ensureDefaultAdminUser() {
  const existing = await User.findOne({ email: DEFAULT_ADMIN_EMAIL.toLowerCase() });
  if (existing) return existing;

  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  return User.create({
    name: 'Shopwave Admin',
    email: DEFAULT_ADMIN_EMAIL,
    phone: process.env.SELLER_WHATSAPP_NUMBER || '+923001234567',
    passwordHash,
    role: 'ADMIN',
    avatarUrl: 'https://placehold.co/200x200/0f172a/ffffff?text=Admin',
    isVerified: true,
    failedLoginAttempts: 0,
    lockUntil: null,
  });
}

// POST /auth/register — buyer only (no self-service seller signup)
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('phone').custom((value) => {
      if (!value || !value.trim()) throw new Error('Phone number is required');
      const cleaned = value.replace(/[-\s]/g, '');
      if (!/^03\d{9}$/.test(cleaned)) throw new Error('Phone must be 11 digits in format 03XX-XXXXXXX');
      return true;
    }),
  ],
  validate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, phone } = req.body;
      const cleanedPhone = phone.replace(/[-\s]/g, '');
      const formattedPhone = `${cleanedPhone.slice(0, 4)}-${cleanedPhone.slice(4)}`;
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      const passwordHash = await hashPassword(password);
      const user = await User.create({
        name,
        email,
        phone: formattedPhone,
        passwordHash,
        plainPassword: password,
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
        user: { id: String(user._id), name: user.name, email: user.email, role: user.role, phone: user.phone, plainPassword: user.plainPassword },
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
        const remainingMs = user.lockUntil.getTime() - Date.now();
        const remainingMins = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
        return res.status(429).json({ error: `Too many failed attempts. Please try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.` });
      }
      const ok = await comparePassword(password, user.passwordHash);
      if (!ok) {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const lockUntil = attempts >= env.LOGIN_MAX_ATTEMPTS
          ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60 * 1000)
          : undefined;
        await User.updateOne({ _id: user._id }, { failedLoginAttempts: attempts, $set: { lockUntil: lockUntil || null } });
        if (lockUntil) {
          return res.status(429).json({ error: `Too many failed attempts. Account temporarily locked for ${env.LOGIN_LOCK_MINUTES} minutes.` });
        }
        const remaining = env.LOGIN_MAX_ATTEMPTS - attempts;
        return res.status(401).json({ error: `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
      }
      await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, lockUntil: null, plainPassword: password });
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
        user: { id: String(user._id), name: user.name, email: user.email, role: user.role, phone: user.phone, avatarUrl: user.avatarUrl, plainPassword: password },
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
      const normalizedEmail = String(email || '').trim().toLowerCase();

      let user = await User.findOne({ email: normalizedEmail });
      if (!user && normalizedEmail === DEFAULT_ADMIN_EMAIL) {
        user = await ensureDefaultAdminUser();
      }

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

// POST /auth/reveal-password — verify email to reveal current account password
router.post('/reveal-password', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (String(email || '').trim().toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ error: 'Provided email does not match your account' });
    }
    return res.json({ password: user.plainPassword || '******' });
  } catch (e) { next(e); }
});

// PATCH /auth/me — update profile
router.patch('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, avatarUrl, password } = req.body;
    const update: any = {};
    if (name) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (password) {
      update.passwordHash = await hashPassword(password);
      update.plainPassword = password;
    }
    const user = await User.findByIdAndUpdate(req.user!.id, { $set: update }, { new: true }).select('-passwordHash');
    return res.json({ user });
  } catch (e) { next(e); }
});

export default router;
