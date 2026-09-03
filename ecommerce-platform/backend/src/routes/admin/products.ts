import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { CodRequest } from '../../models/CodRequest';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../../middleware/auth';
import { buildUploader } from '../../config/upload';
import { uniqueSlug } from '../../utils/auth';
import { ApiError } from '../../middleware/error';

const router = Router();
const upload = buildUploader('products');

router.use(authenticate, requireAdmin);

// GET /admin/products
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { search, status, category } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (category) {
      // Resolve category by slug OR ObjectId, include subcategories
      const cat = await Category.findOne({
        $or: [
          { slug: String(category) },
          ...(String(category).match(/^[0-9a-fA-F]{24}$/) ? [{ _id: String(category) }] : []),
        ],
      });
      if (cat) {
        const subs = await Category.find({ parentCategoryId: cat._id }).select('_id');
        filter.categoryId = { $in: [cat._id, ...subs.map((s) => s._id)] };
      }
    }
    if (search) filter.title = { $regex: String(search), $options: 'i' };
    const items = await Product.find(filter).sort({ createdAt: -1 }).populate('categoryId', 'name slug parentCategoryId').limit(100);

    // PRD_New §Seller Products.1: total count + out-of-stock count
    const total = await Product.countDocuments({ status: { $ne: 'ARCHIVED' } });
    const outOfStock = await Product.countDocuments({
      status: { $ne: 'ARCHIVED' },
      'variants.stockQuantity': 0,
    });

    res.json({ items, total, outOfStock });
  } catch (e) { next(e); }
});

// GET /admin/products/:id
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid product ID');
    }
    const product = await Product.findById(req.params.id).populate('categoryId', 'name slug parentCategoryId');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (e) { next(e); }
});

/**
 * POST /admin/products
 *
 * PRD_New §Edit Product (Critical bug): The previous version failed with
 * "input must be a 24 character hex string, 12 byte Uint8Array, or an integer"
 * because attributeValues were being created with arbitrary string IDs (like "attr_123")
 * and then passed to mongoose.Types.ObjectId(). Now we generate real ObjectIds
 * for all attributes and values BEFORE constructing the product document.
 */
router.post('/', upload.array('images', 8), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = JSON.parse(req.body.payload || '{}');
    const {
      title, description, categoryId, brand, basePrice,
      discountType, discountValue, discountStartAt, discountEndAt,
      status, material,
      attributes, attributeValues, variants,
      isFeatured, featuredRank, featuredStartAt, featuredEndAt,
      // PRD_New: codEligible, weight, tags removed from UI but kept in schema for backward compat
    } = body;

    if (!title || !categoryId || basePrice == null) {
      return res.status(400).json({ error: 'Please fill in all required fields: title, category, and price' });
    }
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: 'Please select a valid category' });
    }
    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(400).json({ error: 'Selected category does not exist' });

    // Validate discount end > start (PRD_New §Edit Product.3)
    if (discountStartAt && discountEndAt && new Date(discountEndAt) <= new Date(discountStartAt)) {
      return res.status(400).json({ error: 'Discount end time must be after the start time' });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const images = (files || []).map((f, i) => ({
      url: (f as any).path || (f as any).secure_url || (f as any).url,
      sortOrder: i,
      isPrimary: i === 0,
    }));

    const slug = uniqueSlug(title, (await Product.find({}).select('slug')).map((p) => p.slug));

    // PRD_New (Critical bug fix): Generate proper ObjectIds for attributes & values
    // Build a map from temp IDs → real ObjectIds so variants can reference them
    const attrIdMap = new Map<string, mongoose.Types.ObjectId>();
    const normalizedAttributes = (attributes || []).map((a: any) => {
      const realId = new mongoose.Types.ObjectId();
      if (a._id) attrIdMap.set(String(a._id), realId);
      return { name: a.name, isGlobal: !!a.isGlobal };
    });

    const normalizedAttrValues = (attributeValues || []).map((av: any) => {
      const realAttrId = av.attributeId && attrIdMap.has(String(av.attributeId))
        ? attrIdMap.get(String(av.attributeId))!
        : new mongoose.Types.ObjectId();
      const realValueId = new mongoose.Types.ObjectId();
      // Map both the temp _id and the (attributeId, value) pair so variants can look it up
      if (av._id) attrIdMap.set(String(av._id), realValueId);
      return {
        _id: realValueId,
        attributeId: realAttrId,
        value: av.value,
        displayMeta: av.displayMeta,
      };
    });

    const normalizedVariants = (variants || []).map((v: any) => ({
      sku: v.sku || `SKU-${Date.now()}`,
      stockQuantity: Math.max(0, Number(v.stockQuantity) || 0),
      priceOverride: v.priceOverride != null && v.priceOverride !== '' ? Number(v.priceOverride) : null,
      imageUrl: v.imageUrl || undefined,
      attributeValues: (v.attributeValues || []).map((id: string) => {
        const mapped = attrIdMap.get(String(id));
        if (!mapped) throw new ApiError(400, 'Variant references an unknown attribute value. Please refresh and try again.');
        return mapped;
      }),
    }));

    const product = await Product.create({
      title,
      slug,
      description: description || '',
      categoryId,
      brand: brand || '',
      basePrice: Number(basePrice),
      discountType: discountType || null,
      discountValue: Number(discountValue) || 0,
      discountStartAt: discountStartAt ? new Date(discountStartAt) : null,
      discountEndAt: discountEndAt ? new Date(discountEndAt) : null,
      codEligible: true,  // PRD_New: always COD-eligible
      status: status || 'PUBLISHED',
      weight: undefined,
      material: material || '',
      customFields: body.customFields || [],
      tags: [],
      images,
      attributes: normalizedAttributes,
      attributeValues: normalizedAttrValues,
      variants: normalizedVariants,
      isFeatured: !!isFeatured,
      featuredRank: featuredRank ?? null,
      featuredStartAt: featuredStartAt ? new Date(featuredStartAt) : null,
      featuredEndAt: featuredEndAt ? new Date(featuredEndAt) : null,
    });
    res.status(201).json({ product });
  } catch (e: any) {
    // PRD_New §Edit Product (Critical bug): never leak raw technical errors to UI
    console.error('[admin/products POST]', e);
    if (e instanceof ApiError) return next(e);
    if (e?.name === 'ValidationError') {
      return res.status(400).json({ error: 'Some fields are missing or invalid. Please review and try again.' });
    }
    if (e?.message?.includes('hex string') || e?.message?.includes('ObjectId')) {
      return res.status(400).json({ error: 'There was a problem saving the product. Please refresh the page and try again.' });
    }
    return res.status(500).json({ error: 'Could not save the product. Please try again.' });
  }
});

// PATCH /admin/products/:id
router.patch('/:id', upload.array('images', 8), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid product ID');
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const body = req.body.payload ? JSON.parse(req.body.payload) : req.body;
    const {
      title, description, categoryId, brand, basePrice,
      discountType, discountValue, discountStartAt, discountEndAt,
      status, material, customFields,
      attributes, attributeValues, variants,
      isFeatured, featuredRank, featuredStartAt, featuredEndAt,
      existingImages,
    } = body;

    if (discountStartAt && discountEndAt && new Date(discountEndAt) <= new Date(discountStartAt)) {
      return res.status(400).json({ error: 'Discount end time must be after the start time' });
    }

    if (title) product.title = title;
    if (description !== undefined) product.description = description;
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ error: 'Please select a valid category' });
      }
      product.categoryId = categoryId;
    }
    if (brand !== undefined) product.brand = brand;
    if (basePrice != null) product.basePrice = Number(basePrice);
    if (discountType !== undefined) product.discountType = discountType || null;
    if (discountValue !== undefined) product.discountValue = Number(discountValue) || 0;
    if (discountStartAt !== undefined) product.discountStartAt = discountStartAt ? new Date(discountStartAt) : null;
    if (discountEndAt !== undefined) product.discountEndAt = discountEndAt ? new Date(discountEndAt) : null;
    if (status) product.status = status;
    if (material !== undefined) product.material = material;
    if (customFields !== undefined) product.customFields = customFields;
    if (attributes) {
      const attrIdMap = new Map<string, mongoose.Types.ObjectId>();
      product.attributes = attributes.map((a: any) => {
        const realId = a._id && mongoose.Types.ObjectId.isValid(String(a._id)) ? new mongoose.Types.ObjectId(String(a._id)) : new mongoose.Types.ObjectId();
        if (a._id) attrIdMap.set(String(a._id), realId);
        return { name: a.name, isGlobal: !!a.isGlobal };
      });
      if (attributeValues) {
        product.attributeValues = attributeValues.map((av: any) => {
          const realAttrId = av.attributeId && attrIdMap.has(String(av.attributeId))
            ? attrIdMap.get(String(av.attributeId))!
            : (av.attributeId && mongoose.Types.ObjectId.isValid(String(av.attributeId)) ? new mongoose.Types.ObjectId(String(av.attributeId)) : new mongoose.Types.ObjectId());
          const realValueId = av._id && mongoose.Types.ObjectId.isValid(String(av._id)) ? new mongoose.Types.ObjectId(String(av._id)) : new mongoose.Types.ObjectId();
          if (av._id) attrIdMap.set(String(av._id), realValueId);
          return { _id: realValueId, attributeId: realAttrId, value: av.value, displayMeta: av.displayMeta };
        });
      }
      if (variants) {
        product.variants = variants.map((v: any) => ({
          sku: v.sku || `SKU-${Date.now()}`,
          stockQuantity: Math.max(0, Number(v.stockQuantity) || 0),
          priceOverride: v.priceOverride != null && v.priceOverride !== '' ? Number(v.priceOverride) : null,
          imageUrl: v.imageUrl || undefined,
          attributeValues: (v.attributeValues || []).map((id: string) => {
            const mapped = attrIdMap.get(String(id));
            if (!mapped) throw new ApiError(400, 'Variant references an unknown attribute value. Please refresh and try again.');
            return mapped;
          }),
        }));
      }
    } else {
      // No attributes change, but maybe variants stock update only
      if (variants) {
        // Preserve existing attribute-value mapping by id
        product.variants = variants.map((v: any) => {
          const existing = product.variants.find((ev: any) => String(ev._id) === String(v._id));
          return {
            _id: existing?._id,
            sku: v.sku || existing?.sku || `SKU-${Date.now()}`,
            stockQuantity: Math.max(0, Number(v.stockQuantity) || 0),
            priceOverride: v.priceOverride != null && v.priceOverride !== '' ? Number(v.priceOverride) : null,
            imageUrl: v.imageUrl || existing?.imageUrl,
            attributeValues: existing?.attributeValues || [],
          };
        });
      }
    }
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (featuredRank !== undefined) product.featuredRank = featuredRank;
    if (featuredStartAt !== undefined) product.featuredStartAt = featuredStartAt ? new Date(featuredStartAt) : null;
    if (featuredEndAt !== undefined) product.featuredEndAt = featuredEndAt ? new Date(featuredEndAt) : null;

    const files = req.files as Express.Multer.File[] | undefined;
    if (existingImages !== undefined) {
      product.images = existingImages;
    }
    if (files && files.length > 0) {
      const startIdx = product.images.length;
      files.forEach((f, i) => {
        product.images.push({
          url: (f as any).path || (f as any).secure_url || (f as any).url,
          sortOrder: startIdx + i,
          isPrimary: product.images.length === 0 && i === 0,
        });
      });
    }
    await product.save();
    res.json({ product });
  } catch (e: any) {
    console.error('[admin/products PATCH]', e);
    if (e instanceof ApiError) return next(e);
    if (e?.message?.includes('hex string') || e?.message?.includes('ObjectId')) {
      return res.status(400).json({ error: 'There was a problem saving the product. Please refresh the page and try again.' });
    }
    return res.status(500).json({ error: 'Could not save the product. Please try again.' });
  }
});

// PATCH /admin/products/:id/promote
router.patch('/:id/promote', async (req, res: Response, next: NextFunction) => {
  try {
    const { isFeatured, featuredRank, featuredStartAt, featuredEndAt } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isFeatured: !!isFeatured,
          featuredRank: featuredRank ?? null,
          featuredStartAt: featuredStartAt ? new Date(featuredStartAt) : null,
          featuredEndAt: featuredEndAt ? new Date(featuredEndAt) : null,
        },
      },
      { new: true }
    );
    res.json({ product });
  } catch (e) { next(e); }
});

// DELETE /admin/products/:id
router.delete('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /admin/products/:id/cod-pending — show pending COD requests that reserve this product (PRD_New §Edit Product.8)
router.get('/:id/cod-pending', async (req, res: Response, next: NextFunction) => {
  try {
    const pending = await CodRequest.find({
      status: { $in: ['AWAITING_CONVERSATION', 'PENDING_SELLER_APPROVAL'] },
      'items.productId': new mongoose.Types.ObjectId(req.params.id),
    }).populate('userId', 'name email phone').sort({ createdAt: -1 });
    res.json({ items: pending });
  } catch (e) { next(e); }
});

export default router;
