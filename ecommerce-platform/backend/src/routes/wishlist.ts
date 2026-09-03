import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Wishlist } from '../models/Wishlist';
import { Product } from '../models/Product';
import { authenticate, AuthenticatedRequest, requireBuyer } from '../middleware/auth';
import { computeEffectivePrice, productTotalStock, isProductOutOfStock } from '../utils/pricing';

const router = Router();
router.use(authenticate, requireBuyer);

// GET /wishlist
router.get('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user!.id });
    if (!wishlist) return res.json({ items: [] });
    const products = await Product.find({ _id: { $in: wishlist.productIds }, status: 'PUBLISHED' })
      .populate('categoryId', 'name slug');
    const items = products.map((p: any) => {
      const { effectivePrice, discountAmount, discountActive } = computeEffectivePrice(p);
      return {
        ...p.toObject(),
        effectivePrice,
        discountAmount,
        discountActive,
        totalStock: productTotalStock(p),
        outOfStock: isProductOutOfStock(p),
        primaryImage: p.images?.find((i: any) => i.isPrimary)?.url || p.images?.[0]?.url || '',
      };
    });
    res.json({ items });
  } catch (e) { next(e); }
});

// POST /wishlist/:productId
router.post('/:productId', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid productId' });
    }
    let wishlist = await Wishlist.findOne({ userId: req.user!.id });
    if (!wishlist) wishlist = await Wishlist.create({ userId: req.user!.id, productIds: [] });
    if (!wishlist.productIds.some((p) => p.toString() === productId)) {
      wishlist.productIds.push(new mongoose.Types.ObjectId(productId));
      await wishlist.save();
    }
    res.json({ ok: true, wishlist });
  } catch (e) { next(e); }
});

// DELETE /wishlist/:productId
router.delete('/:productId', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { productId } = req.params;
    const wishlist = await Wishlist.findOne({ userId: req.user!.id });
    if (!wishlist) return res.json({ ok: true });
    wishlist.productIds = wishlist.productIds.filter((p) => p.toString() !== productId);
    await wishlist.save();
    res.json({ ok: true, wishlist });
  } catch (e) { next(e); }
});

export default router;
