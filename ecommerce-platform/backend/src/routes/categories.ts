import { Router, Response } from 'express';
import { Category } from '../models/Category';

const router = Router();

/**
 * GET /categories — top-level categories only (parentCategoryId = null)
 * Subcategories are fetched via /categories/:id/subcategories or /subcategories
 */
router.get('/', async (_req, res: Response, next) => {
  try {
    const categories = await Category.find({ isActive: true, parentCategoryId: null })
      .sort({ sortOrder: 1, name: 1 });
    res.json({ items: categories });
  } catch (e) { next(e); }
});

/**
 * GET /categories/tree — full tree (categories + their subcategories in one call)
 */
router.get('/tree', async (_req, res: Response, next) => {
  try {
    const all = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    const parents = all.filter((c) => !c.parentCategoryId);
    const tree = parents.map((p) => ({
      ...p.toObject(),
      subcategories: all.filter((s) => String(s.parentCategoryId) === String(p._id)),
    }));
    res.json({ items: tree });
  } catch (e) { next(e); }
});

/**
 * GET /categories/:id/subcategories — list subcategories of a parent
 */
router.get('/:id/subcategories', async (req, res: Response, next) => {
  try {
    const subs = await Category.find({ isActive: true, parentCategoryId: req.params.id })
      .sort({ sortOrder: 1, name: 1 });
    res.json({ items: subs });
  } catch (e) { next(e); }
});

export default router;
