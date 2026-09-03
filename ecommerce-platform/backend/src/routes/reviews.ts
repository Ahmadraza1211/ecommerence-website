import { Router, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { Review } from '../models/Review';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { authenticate, AuthenticatedRequest, requireBuyer } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { pushNotification } from '../services/notificationService';

const router = Router();

/**
 * GET /reviews/product/:productId
 * PRD_New §Seller Review: sortable by time, groupable by category
 */
router.get('/product/:productId', async (req, res: Response, next: NextFunction) => {
  try {
    const sort = req.query.sort === 'time' ? { createdAt: -1 as const } : { createdAt: -1 as const };
    const reviews = await Review.find({ productId: req.params.productId, isHidden: false })
      .sort(sort)
      .populate('userId', 'name avatarUrl')
      .populate({ path: 'productId', select: 'title categoryId', populate: { path: 'categoryId', select: 'name slug' } });
    res.json({ items: reviews });
  } catch (e) { next(e); }
});

/**
 * GET /reviews/grouped — group all reviews by category (PRD_New §Seller Review)
 * Public endpoint.
 */
router.get('/grouped', async (_req, res: Response, next: NextFunction) => {
  try {
    const reviews = await Review.find({ isHidden: false })
      .sort({ createdAt: -1 })
      .populate('userId', 'name avatarUrl')
      .populate({ path: 'productId', select: 'title categoryId', populate: { path: 'categoryId', select: 'name slug' } });

    const groups: Record<string, any> = {};
    for (const r of reviews as any[]) {
      const cat = r.productId?.categoryId;
      const catName = cat?.name || 'Uncategorized';
      const catId = cat?._id ? String(cat._id) : 'uncategorized';
      if (!groups[catId]) groups[catId] = { categoryId: catId, categoryName: catName, reviews: [] };
      groups[catId].reviews.push(r);
    }
    res.json({ groups: Object.values(groups) });
  } catch (e) { next(e); }
});

// POST /reviews — buyer-only, server validates order is DELIVERED and belongs to user
router.post(
  '/',
  authenticate,
  requireBuyer,
  [
    body('productId').isString(),
    body('orderId').isString(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString(),
  ],
  validate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { productId, orderId, rating, comment, photos } = req.body;
      const order = await Order.findOne({ _id: orderId, userId: req.user!.id });
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status !== 'DELIVERED') {
        return res.status(400).json({ error: 'You can only review after your order is delivered' });
      }
      const ownsProduct = order.items.some((i) => String(i.productId) === String(productId));
      if (!ownsProduct) {
        return res.status(400).json({ error: 'You can only review products you purchased in this order' });
      }
      const existing = await Review.findOne({ productId, orderId, userId: req.user!.id });
      if (existing) {
        return res.status(409).json({ error: 'You have already reviewed this product for this order' });
      }
      const review = await Review.create({
        productId,
        orderId,
        userId: req.user!.id,
        rating,
        comment: comment || '',
        photos: photos || [],
        isVerifiedPurchase: true,
      });
      const { User } = await import('../models/User');
      const admins = await User.find({ role: 'ADMIN' });
      for (const a of admins) {
        await pushNotification({
          userId: a._id,
          type: 'NEW_REVIEW',
          title: 'New review submitted',
          body: `A buyer left a ${rating}-star review on a product.`,
        });
      }
      res.status(201).json({ review });
    } catch (e) { next(e); }
  }
);

export default router;
