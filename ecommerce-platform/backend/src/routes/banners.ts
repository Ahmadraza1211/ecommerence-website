import { Router, Response } from 'express';
import { Banner } from '../models/Banner';

const router = Router();

// GET /banners/active — includes bundle deal tiers
router.get('/active', async (_req, res: Response, next) => {
  try {
    const now = new Date();
    let banners = await Banner.find({
      isActive: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    }).sort({ sortOrder: 1, createdAt: -1 });

    if (banners.length === 0) {
      banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
    }
    if (banners.length === 0) {
      banners = await Banner.find().sort({ createdAt: -1 });
    }

    const enriched = banners.map((b: any) => {
      const obj = b.toObject();
      let tiers = obj.bundleTiers || [];
      if (tiers.length === 0 && obj.dealQuantity && obj.dealDiscountPercent) {
        tiers = [{ quantity: Number(obj.dealQuantity), discountPercent: Number(obj.dealDiscountPercent) }];
      }
      return {
        ...obj,
        bundleTiers: tiers,
        hasBundleDeal: tiers.length > 0,
        timeRemainingMs: (obj.endAt ? new Date(obj.endAt).getTime() : Date.now() + 86400000) - now.getTime(),
      };
    });
    res.json({ items: enriched });
  } catch (e) { next(e); }
});

export default router;
