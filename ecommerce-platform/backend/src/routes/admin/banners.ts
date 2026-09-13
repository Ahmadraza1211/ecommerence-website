import { Router, Response, NextFunction } from 'express';
import { Banner } from '../../models/Banner';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { buildUploader } from '../../config/upload';
import mongoose from 'mongoose';

const router = Router();
const upload = buildUploader('banners');

router.use(authenticate, requireAdmin);

// GET /admin/banners
router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const items = await Banner.find().sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});

/**
 * POST /admin/banners
 * PRD_New V3 §Banner Bundle Deal: supports bundleTiers (multiple deal tiers).
 */
router.post('/', upload.single('image'), async (req, res: Response, next: NextFunction) => {
  try {
    const body = req.body.payload ? JSON.parse(req.body.payload) : req.body;
    const { title, subtitle, startAt, endAt, isActive,
            ctaCategory, ctaProduct, dealQuantity, dealDiscountPercent,
            bundleTiers, autoStart } = body;
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Please upload a banner image' });
    if (!title || !endAt) {
      return res.status(400).json({ error: 'Please fill in title and end time' });
    }

    // PRD_New V3 §Edit Product.4 / §Banner.5: Start Time behavior
    // Auto-select hides Start, defaults to now. Past start = now.
    let actualStart: Date;
    if (autoStart || !startAt) {
      actualStart = new Date();
    } else {
      const parsed = new Date(startAt);
      actualStart = parsed < new Date() ? new Date() : parsed;
    }
    const actualEnd = new Date(endAt);
    if (actualEnd <= actualStart) {
      return res.status(400).json({ error: 'End time must be after the start time' });
    }

    if (ctaCategory) {
      const cat = await Category.findById(ctaCategory);
      if (!cat) return res.status(400).json({ error: 'Selected category does not exist' });
    }
    if (ctaProduct) {
      const prod = await Product.findById(ctaProduct);
      if (!prod) return res.status(400).json({ error: 'Selected product does not exist' });
    }

    // PRD_New V3: validate bundle tiers
    const normalizedTiers = (bundleTiers || []).map((t: any) => ({
      quantity: Math.max(1, Number(t.quantity)),
      discountPercent: Math.min(100, Math.max(0, Number(t.discountPercent))),
    })).filter((t: any) => t.quantity > 0);

    const banner = await Banner.create({
      imageUrl: (file as any).path,
      title,
      subtitle: subtitle || '',
      ctaText: '',
      ctaLink: ctaProduct ? `/product/${(await Product.findById(ctaProduct))?.slug}` : (ctaCategory ? `/products?category=${(await Category.findById(ctaCategory))?.slug}` : ''),
      ctaCategory: ctaCategory || null,
      ctaProduct: ctaProduct || null,
      dealQuantity: dealQuantity != null ? Number(dealQuantity) : null,
      dealDiscountPercent: dealDiscountPercent != null ? Number(dealDiscountPercent) : null,
      bundleTiers: normalizedTiers,
      startAt: actualStart,
      endAt: actualEnd,
      sortOrder: 0,
      isActive: isActive !== false,
    });
    res.status(201).json({ banner });
  } catch (e) { next(e); }
});

// PATCH /admin/banners/:id
router.patch('/:id', upload.single('image'), async (req, res: Response, next: NextFunction) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    const body = req.body.payload ? JSON.parse(req.body.payload) : req.body;
    const { title, subtitle, startAt, endAt, isActive,
            ctaCategory, ctaProduct, dealQuantity, dealDiscountPercent,
            bundleTiers, autoStart } = body;

    if (title) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;

    // PRD_New V3 §Banner.5: Start Time behavior
    if (autoStart) {
      banner.startAt = new Date();
    } else if (startAt) {
      const parsed = new Date(startAt);
      banner.startAt = parsed < new Date() ? new Date() : parsed;
    }
    if (endAt) {
      banner.endAt = new Date(endAt);
      if (banner.endAt <= banner.startAt) {
        return res.status(400).json({ error: 'End time must be after the start time' });
      }
    }
    if (isActive !== undefined) banner.isActive = isActive;

    if (ctaCategory !== undefined) banner.ctaCategory = ctaCategory || null;
    if (ctaProduct !== undefined) {
      banner.ctaProduct = ctaProduct || null;
      if (ctaProduct) {
        const prod = await Product.findById(ctaProduct);
        if (prod) banner.ctaLink = `/product/${prod.slug}`;
      } else if (ctaCategory) {
        const cat = await Category.findById(ctaCategory);
        if (cat) banner.ctaLink = `/products?category=${cat.slug}`;
      } else {
        banner.ctaLink = '';
      }
    }
    if (dealQuantity !== undefined) banner.dealQuantity = dealQuantity != null ? Number(dealQuantity) : null;
    if (dealDiscountPercent !== undefined) banner.dealDiscountPercent = dealDiscountPercent != null ? Number(dealDiscountPercent) : null;

    // PRD_New V3: update bundle tiers
    if (bundleTiers !== undefined) {
      banner.bundleTiers = bundleTiers.map((t: any) => ({
        quantity: Math.max(1, Number(t.quantity)),
        discountPercent: Math.min(100, Math.max(0, Number(t.discountPercent))),
      }));
    }

    const file = req.file as Express.Multer.File | undefined;
    if (file) banner.imageUrl = (file as any).path;
    else if (body.removeImage) banner.imageUrl = '';
    await banner.save();
    res.json({ banner });
  } catch (e) { next(e); }
});

// DELETE /admin/banners/:id
router.delete('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
