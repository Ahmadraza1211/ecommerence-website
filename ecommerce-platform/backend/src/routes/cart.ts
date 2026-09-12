import { Router, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { CodRequest } from '../models/CodRequest';
import { Banner } from '../models/Banner';
import { authenticate, AuthenticatedRequest, requireBuyer } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { computeEffectivePrice } from '../utils/pricing';

const router = Router();
router.use(authenticate, requireBuyer);

async function getCartWithItems(userId: string) {
  const cart = await Cart.findOne({ userId });
  if (!cart) return null;
  const enrichedItems: any[] = [];
  for (const item of cart.items) {
    const product = await Product.findById(item.productId);
    const variant = product?.variants.find((v) => v._id?.equals(item.variantId));
    if (!product || !variant) continue;
    const basePrice = variant.priceOverride != null ? variant.priceOverride : product.basePrice;
    const { effectivePrice } = computeEffectivePrice({
      basePrice,
      discountType: product.discountType,
      discountValue: product.discountValue,
      discountStartAt: product.discountStartAt,
      discountEndAt: product.discountEndAt,
    });
    // Ensure offer/bundle deals or discounted items retain valid price and do not fallback to 0 subtotal
    const priceVal = (item as any).bundlePrice ?? (item as any).offerPrice ?? effectivePrice;
    const unitPrice = priceVal > 0 ? priceVal : (basePrice > 0 ? basePrice : 0);
    enrichedItems.push({
      variantId: String(variant._id),
      productId: String(product._id),
      title: product.title,
      slug: product.slug,
      quantity: item.quantity,
      priceAtAdd: unitPrice,
      stockAvailable: variant.stockQuantity,
      outOfStock: variant.stockQuantity <= 0,
      image: product.images.find((i) => i.isPrimary)?.url || product.images?.[0]?.url || '',
      variantLabel: '',
      isBundleDeal: (item as any).isBundleDeal || false,
    });
  }
  const subtotal = enrichedItems.reduce((s, i) => s + i.priceAtAdd * i.quantity, 0);
  return {
    _id: cart._id,
    items: enrichedItems,
    subtotal,
    totalItems: enrichedItems.reduce((s, i) => s + i.quantity, 0),
  };
}

/**
 * GET /cart
 * PRD_New V4: pending COD requests appear as SEPARATE compact entries in "Your Cart".
 * They do NOT lock the cart — buyer can still proceed with new checkout.
 * Once accepted/rejected, they automatically disappear (filtered by status).
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cart = await getCartWithItems(req.user!.id);
    const pendingCod = await CodRequest.find({
      userId: req.user!.id,
      status: { $in: ['AWAITING_CONVERSATION', 'PENDING_SELLER_APPROVAL'] },
    }).sort({ createdAt: -1 });

    // Compact COD entries — small icon style, no clutter
    const codEntries = pendingCod.map((r: any) => ({
      _id: r._id,
      requestStatus: r.status,
      total: r.total,
      itemCount: r.items.length,
      firstItemTitle: r.items[0]?.title || '',
      createdAt: r.createdAt,
    }));

    res.json({
      cart: cart || { items: [], subtotal: 0, totalItems: 0 },
      pendingCodRequests: codEntries,
    });
  } catch (e) { next(e); }
});

// GET /cart/validate-stock
router.get('/validate-stock', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cart = await Cart.findOne({ userId: req.user!.id });
    if (!cart || cart.items.length === 0) return res.json({ valid: false, reason: 'Your cart is empty', items: [] });
    const issues: any[] = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) { issues.push({ variantId: String(item.variantId), issue: 'Product no longer exists' }); continue; }
      const variant = product.variants.find((v) => v._id?.equals(item.variantId));
      if (!variant) { issues.push({ variantId: String(item.variantId), issue: 'Variant no longer exists' }); continue; }
      if (variant.stockQuantity <= 0) issues.push({ variantId: String(item.variantId), issue: 'Out of stock', available: 0 });
      else if (variant.stockQuantity < item.quantity) issues.push({ variantId: String(item.variantId), issue: 'Insufficient stock', available: variant.stockQuantity });
    }
    res.json({ valid: issues.length === 0, reason: issues.length === 0 ? '' : 'Some items are no longer available', items: issues });
  } catch (e) { next(e); }
});

// POST /cart/items
router.post('/items', [body('variantId').isString(), body('quantity').isInt({ min: 1 })], validate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { variantId, quantity } = req.body;
      const product = await Product.findOne({ 'variants._id': new mongoose.Types.ObjectId(variantId) });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      const variant = product.variants.find((v) => v._id?.equals(variantId));
      if (!variant) return res.status(404).json({ error: 'Variant not found' });
      if (variant.stockQuantity <= 0) return res.status(400).json({ error: 'This item is out of stock' });
      let cart = await Cart.findOne({ userId: req.user!.id });
      if (!cart) cart = await Cart.create({ userId: req.user!.id, items: [] });
      const existing = cart.items.find((i) => i.variantId.toString() === variantId);
      if (existing) existing.quantity = Math.min(variant.stockQuantity, existing.quantity + quantity);
      else cart.items.push({ variantId: new mongoose.Types.ObjectId(variantId), productId: product._id, quantity } as any);
      await cart.save();
      const updated = await getCartWithItems(req.user!.id);
      res.json({ cart: updated });
    } catch (e) { next(e); }
  }
);

// POST /cart/apply-bundle
router.post('/apply-bundle', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { bannerId, tierIndex, variantId } = req.body;
    if (!bannerId || variantId === undefined || tierIndex === undefined) return res.status(400).json({ error: 'bannerId, tierIndex, variantId required' });
    const banner = await Banner.findById(bannerId);
    if (!banner || !banner.isActive) return res.status(404).json({ error: 'Banner deal not found' });
    const now = new Date();
    if (banner.startAt > now || banner.endAt < now) return res.status(400).json({ error: 'This deal has expired' });
    const tier = banner.bundleTiers[tierIndex];
    if (!tier) return res.status(400).json({ error: 'Invalid deal tier' });
    const product = await Product.findOne({ 'variants._id': new mongoose.Types.ObjectId(variantId) });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const variant = product.variants.find((v) => v._id?.equals(variantId));
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    if (variant.stockQuantity < tier.quantity) return res.status(400).json({ error: `Not enough stock — deal requires ${tier.quantity}, only ${variant.stockQuantity} available` });
    const base = variant.priceOverride != null ? variant.priceOverride : product.basePrice;
    const bundlePrice = Math.round(base * tier.quantity * (1 - tier.discountPercent / 100));
    let cart = await Cart.findOne({ userId: req.user!.id });
    if (!cart) cart = await Cart.create({ userId: req.user!.id, items: [] });
    cart.items = cart.items.filter((i: any) => !i.isBundleDeal);
    cart.items.push({ variantId: new mongoose.Types.ObjectId(variantId), productId: product._id, quantity: tier.quantity, isBundleDeal: true, bundlePrice, bundleBannerId: banner._id } as any);
    await cart.save();
    const updated = await getCartWithItems(req.user!.id);
    res.json({ cart: updated });
  } catch (e) { next(e); }
});

// PATCH /cart/items/:variantId
router.patch('/items/:variantId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { variantId } = req.params;
    const { quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.user!.id });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    const item = cart.items.find((i) => i.variantId.toString() === variantId);
    if (!item) return res.status(404).json({ error: 'Item not in cart' });
    if ((item as any).isBundleDeal) return res.status(400).json({ error: 'Quantity is locked for bundle deal items' });
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });
    const product = await Product.findOne({ 'variants._id': new mongoose.Types.ObjectId(variantId) });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const variant = product.variants.find((v) => v._id?.equals(variantId));
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    if (quantity > variant.stockQuantity) return res.status(400).json({ error: `Only ${variant.stockQuantity} available` });
    item.quantity = quantity;
    await cart.save();
    const updated = await getCartWithItems(req.user!.id);
    res.json({ cart: updated });
  } catch (e) { next(e); }
});

// DELETE /cart/items/:variantId
router.delete('/items/:variantId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { variantId } = req.params;
    const cart = await Cart.findOne({ userId: req.user!.id });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    cart.items = cart.items.filter((i) => i.variantId.toString() !== variantId);
    await cart.save();
    const updated = await getCartWithItems(req.user!.id);
    res.json({ cart: updated });
  } catch (e) { next(e); }
});

// DELETE /cart
router.delete('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await Cart.updateOne({ userId: req.user!.id }, { $set: { items: [] } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
