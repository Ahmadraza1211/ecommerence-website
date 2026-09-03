import { Router, Response } from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Review } from '../models/Review';
import { computeEffectivePrice, productTotalStock, isProductOutOfStock } from '../utils/pricing';

const router = Router();

function attachComputed(product: any) {
  const { effectivePrice, discountAmount, discountActive } = computeEffectivePrice(product);
  return {
    ...product.toObject ? product.toObject() : product,
    effectivePrice,
    discountAmount,
    discountActive,
    totalStock: productTotalStock(product),
    outOfStock: isProductOutOfStock(product),
    primaryImage: product.images?.find((i: any) => i.isPrimary)?.url || product.images?.[0]?.url || '',
  };
}

/**
 * GET /products
 *
 * FIX (PRD_New §Marketplace.4): filtering by category via URL query (?category=fashion)
 * previously returned no products because the slug was being passed directly as an ObjectId.
 * We now resolve the slug → ObjectId(s) first, including child subcategories.
 */
router.get('/', async (req, res: Response, next) => {
  try {
    const {
      category, subcategory, search, sort = 'newest',
      minPrice, maxPrice, color, size,
      page = '1', limit = '12', inStock,
    } = req.query;

    const filter: any = { status: 'PUBLISHED' };

    // Category filter — accept either a slug or an ObjectId, and include subcategories
    if (category) {
      const cat = await Category.findOne({
        $or: [
          { slug: String(category) },
          { _id: String(category).match(/^[0-9a-fA-F]{24}$/) ? String(category) : null as any },
        ].filter(Boolean) as any,
      });
      if (cat) {
        // Include this category and all its subcategories
        const subCats = await Category.find({ parentCategoryId: cat._id }).select('_id');
        const catIds = [cat._id, ...subCats.map((s) => s._id)];
        filter.categoryId = { $in: catIds };
      } else {
        // No matching category → empty result (rather than returning all products)
        return res.json({ items: [], pagination: { page: 1, limit: 12, total: 0, pages: 0 } });
      }
    }

    // Subcategory filter (more specific than category)
    if (subcategory) {
      const sub = await Category.findOne({ slug: String(subcategory) });
      if (sub) {
        filter.categoryId = sub._id;
      }
    }

    if (search) {
      filter.$text = { $search: String(search) };
    }
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }
    if (color) filter['attributeValues.value'] = { $in: [String(color)] };
    if (size) filter['attributeValues.value'] = { $in: [String(size)] };

    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      'price-low': { basePrice: 1 },
      'price-high': { basePrice: -1 },
      popularity: { 'tags.0': 1 },
      rating: { createdAt: -1 },
      discount: { discountValue: -1 },
    };
    const sortOption = sortMap[String(sort)] || sortMap.newest;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(String(limit), 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(filter).sort(sortOption).skip(skip).limit(limitNum)
      .populate('categoryId', 'name slug parentCategoryId');
    let items = products.map(attachComputed);
    if (String(inStock) === 'true') {
      items = items.filter((p: any) => !p.outOfStock);
    }

    // Featured first (unless explicit price/discount sort)
    if (!['price-low', 'price-high', 'discount'].includes(String(sort))) {
      const featured = items.filter((p: any) => p.isFeatured && featuredActive(p)).sort((a: any, b: any) => (a.featuredRank || 9999) - (b.featuredRank || 9999));
      const rest = items.filter((p: any) => !(p.isFeatured && featuredActive(p)));
      items = [...featured, ...rest];
    }

    const total = await Product.countDocuments(filter);
    res.json({
      items,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (e) { next(e); }
});

function featuredActive(p: any): boolean {
  const now = new Date();
  const startOk = !p.featuredStartAt || p.featuredStartAt <= now;
  const endOk = !p.featuredEndAt || p.featuredEndAt >= now;
  return p.isFeatured && startOk && endOk;
}

// GET /products/featured
router.get('/featured', async (_req, res: Response, next) => {
  try {
    const now = new Date();
    const products = await Product.find({
      status: 'PUBLISHED',
      isFeatured: true,
      $or: [{ featuredStartAt: null }, { featuredStartAt: { $lte: now } }],
      $and: [
        { $or: [{ featuredEndAt: null }, { featuredEndAt: { $gte: now } }] },
      ],
    }).sort({ featuredRank: 1, createdAt: -1 }).limit(8)
      .populate('categoryId', 'name slug parentCategoryId');
    res.json({ items: products.map(attachComputed) });
  } catch (e) { next(e); }
});

// GET /products/:slug
router.get('/:slug', async (req, res: Response, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, status: 'PUBLISHED' })
      .populate('categoryId', 'name slug parentCategoryId');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const reviews = await Review.find({ productId: product._id, isHidden: false }).sort({ createdAt: -1 }).limit(20)
      .populate('userId', 'name avatarUrl');
    const result = attachComputed(product);
    result.reviews = reviews;
    res.json({ product: result });
  } catch (e) { next(e); }
});

// GET /products/:slug/similar
router.get('/:slug/similar', async (req, res: Response, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const similar = await Product.find({
      _id: { $ne: product._id },
      categoryId: product.categoryId,
      status: 'PUBLISHED',
    }).limit(6).populate('categoryId', 'name slug parentCategoryId');
    res.json({ items: similar.map(attachComputed) });
  } catch (e) { next(e); }
});

// GET /products/:id/reviews
router.get('/:id/reviews', async (req, res: Response, next) => {
  try {
    const sort = req.query.sort === 'time' ? { createdAt: -1 as const } : { createdAt: -1 as const };
    const reviews = await Review.find({ productId: req.params.id, isHidden: false })
      .sort(sort)
      .populate('userId', 'name avatarUrl')
      .populate('productId', 'title categoryId')
      .populate({ path: 'productId', populate: { path: 'categoryId', select: 'name slug' } });
    res.json({ items: reviews });
  } catch (e) { next(e); }
});

export default router;
