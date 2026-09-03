import { Router, Response } from 'express';
import { Notification } from '../models/Notification';
import { authenticate, AuthenticatedRequest, requireAny } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAny);

// GET /notifications?unread=true
router.get('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const onlyUnread = req.query.unread === 'true';
    const filter: any = { userId: req.user!.id };
    if (onlyUnread) filter.isRead = false;
    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user!.id, isRead: false });
    res.json({ items, unreadCount });
  } catch (e) { next(e); }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: 'Notification not found' });
    res.json({ notification: n });
  } catch (e) { next(e); }
});

// PATCH /notifications/read-all
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user!.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
