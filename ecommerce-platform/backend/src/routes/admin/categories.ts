import { Router, Response, NextFunction } from 'express';
import { Category } from '../../models/Category';
import { Product } from '../../models/Product';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { buildUploader } from '../../config/upload';
import { uniqueSlug } from '../../utils/auth';
import { ApiError } from '../../middleware/error';

const router = Router();
const upload = buildUploader('categories');

router.use(authenticate, requireAdmin);

// GET /admin/categories — full tree (categories + subcategories)
router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const all = await Category.find().sort({ sortOrder: 1, name: 1 });
    const parents = all.filter((c) => !c.parentCategoryId);
    const tree = parents.map((p) => ({
      ...p.toObject(),
      subcategories: all.filter((s) => String(s.parentCategoryId) === String(p._id)),
    }));
    res.json({ items: tree, flat: all });
  } catch (e) { next(e); }
});

// POST /admin/categories — create a category OR subcategory (if parentCategoryId is set)
router.post('/', upload.single('image'), async (req, res: Response, next: NextFunction) => {
  try {
    const body = req.body.payload ? JSON.parse(req.body.payload) : req.body;
    const { name, parentCategoryId, sortOrder, isActive } = body;
    if (!name) return res.status(400).json({ error: 'Please enter a name' });

    if (parentCategoryId) {
      const parent = await Category.findById(parentCategoryId);
      if (!parent) return res.status(400).json({ error: 'Parent category does not exist' });
    }

    const file = req.file as Express.Multer.File | undefined;
    const existing = (await Category.find({}).select('slug')).map((c) => c.slug);
    const slug = uniqueSlug(name, existing);
    // V3: Auto sort numbering — new categories auto-assign maxSort+1 (scoped to parent)
    const sortFilter = parentCategoryId ? { parentCategoryId } : { parentCategoryId: null };
    const maxSortDoc = await Category.findOne(sortFilter).sort({ sortOrder: -1 }).select('sortOrder');
    const autoSortOrder = maxSortDoc ? maxSortDoc.sortOrder + 1 : 1;
    const category = await Category.create({
      name,
      slug,
      parentCategoryId: parentCategoryId || null,
      imageUrl: file ? (file as any).path : undefined,
      sortOrder: Number(sortOrder) || autoSortOrder,
      isActive: isActive !== false,
    });
    res.status(201).json({ category });
  } catch (e) { next(e); }
});

// PATCH /admin/categories/:id
router.patch('/:id', upload.single('image'), async (req, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const body = req.body.payload ? JSON.parse(req.body.payload) : req.body;
    const { name, parentCategoryId, sortOrder, isActive } = body;
    if (name) category.name = name;
    if (parentCategoryId !== undefined) {
      if (parentCategoryId && String(parentCategoryId) === String(category._id)) {
        return res.status(400).json({ error: 'A category cannot be its own parent' });
      }
      category.parentCategoryId = parentCategoryId || null;
    }
    if (sortOrder !== undefined) category.sortOrder = Number(sortOrder);
    if (isActive !== undefined) category.isActive = isActive;
    const file = req.file as Express.Multer.File | undefined;
    if (file) category.imageUrl = (file as any).path;
    await category.save();
    res.json({ category });
  } catch (e) { next(e); }
});

// DELETE /admin/categories/:id
router.delete('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const subCats = await Category.find({ parentCategoryId: req.params.id }).select('_id');
    const subIds = subCats.map((s) => s._id);

    const categoryIdsToUnlink = [req.params.id, ...subIds.map(String)];

    await Product.updateMany({ categoryId: { $in: categoryIdsToUnlink } }, { $unset: { categoryId: 1 } });
    await Category.deleteMany({ parentCategoryId: req.params.id });
    await Category.findByIdAndDelete(req.params.id);

    res.json({ ok: true, deletedSubcategories: subIds.length });
  } catch (e) { next(e); }
});

// PATCH /admin/categories/:id/reorder — swap sortOrder with adjacent item
router.patch('/:id/reorder', async (req, res: Response, next: NextFunction) => {
  try {
    const { direction } = req.body; // 'up' or 'down'
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    const sortFilter = cat.parentCategoryId
      ? { parentCategoryId: cat.parentCategoryId }
      : { parentCategoryId: null };
    const siblings = await Category.find(sortFilter).sort({ sortOrder: 1 });
    const idx = siblings.findIndex((s) => String(s._id) === String(cat._id));
    if (direction === 'up' && idx > 0) {
      const swap = siblings[idx - 1];
      const tmp = cat.sortOrder;
      cat.sortOrder = swap.sortOrder;
      swap.sortOrder = tmp;
      await cat.save();
      await swap.save();
    } else if (direction === 'down' && idx < siblings.length - 1) {
      const swap = siblings[idx + 1];
      const tmp = cat.sortOrder;
      cat.sortOrder = swap.sortOrder;
      swap.sortOrder = tmp;
      await cat.save();
      await swap.save();
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
