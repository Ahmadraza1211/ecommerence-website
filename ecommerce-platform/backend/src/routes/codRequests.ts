import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { CodRequest } from '../models/CodRequest';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { Address } from '../models/Address';
import { authenticate, AuthenticatedRequest, requireBuyer } from '../middleware/auth';
import { computeEffectivePrice } from '../utils/pricing';
import { env } from '../config/env';
import { pushNotification } from '../services/notificationService';

const router = Router();
router.use(authenticate, requireBuyer);

/**
 * POST /cod-requests
 *
 * PRD_New §My Orders.4 (COD stock logic): stock is NO LONGER held at request creation.
 * It is only decremented when the seller accepts the request.
 * We DO check availability at creation (so the buyer doesn't get a wa.me link for
 * an out-of-stock item) but we don't decrement.
 */
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { addressId, items: directItems } = req.body;
    if (!addressId) return res.status(400).json({ error: 'Please select a delivery address' });
    const address = await Address.findOne({ _id: addressId, userId: req.user!.id });
    if (!address) return res.status(404).json({ error: 'Address not found' });

    let lineItems: { variantId: string; quantity: number }[] = [];
    if (directItems && Array.isArray(directItems) && directItems.length > 0) {
      lineItems = directItems.map((i: any) => ({ variantId: String(i.variantId), quantity: Number(i.quantity) }));
    } else {
      const cart = await Cart.findOne({ userId: req.user!.id });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ error: 'Your cart is empty' });
      }
      lineItems = cart.items.map((i) => ({ variantId: String(i.variantId), quantity: i.quantity }));
    }

    const snapshot: any[] = [];
    let subtotal = 0;
    let discountAmount = 0;
    for (const line of lineItems) {
      const product = await Product.findOne({ 'variants._id': new mongoose.Types.ObjectId(line.variantId) });
      if (!product) return res.status(404).json({ error: 'One of the products in your cart no longer exists' });
      const variant = product.variants.find((v) => v._id?.equals(line.variantId));
      if (!variant) return res.status(404).json({ error: 'Variant not found' });
      if (variant.stockQuantity < line.quantity) {
        return res.status(400).json({ error: `Not enough stock for "${product.title}" — only ${variant.stockQuantity} left` });
      }
      const base = variant.priceOverride != null ? variant.priceOverride : product.basePrice;
      const { effectivePrice, discountAmount: dAmt } = computeEffectivePrice({
        basePrice: base,
        discountType: product.discountType,
        discountValue: product.discountValue,
        discountStartAt: product.discountStartAt,
        discountEndAt: product.discountEndAt,
      });
      subtotal += base * line.quantity;
      discountAmount += dAmt * line.quantity;
      snapshot.push({
        variantId: variant._id,
        productId: product._id,
        title: product.title,
        variantLabel: '',
        quantity: line.quantity,
        priceAtRequest: effectivePrice,
      });
    }
    const total = subtotal - discountAmount;

    const codRequest = await CodRequest.create({
      userId: req.user!.id,
      addressId,
      status: 'AWAITING_CONVERSATION',
      items: snapshot,
      subtotal,
      discountAmount,
      total,
      // PRD_New: NO stock held at creation. stockHeldUntil is null.
      stockHeldUntil: null,
    });

    const orderText = buildWhatsAppMessage(codRequest, address);
    const waLink = `https://wa.me/${env.SELLER_WHATSAPP_NUMBER}?text=${encodeURIComponent(orderText)}`;

    res.status(201).json({ codRequest, waLink });
  } catch (e) { next(e); }
});

// PATCH /cod-requests/:id/conversation-done
router.patch('/:id/conversation-done', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const codRequest = await CodRequest.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!codRequest) return res.status(404).json({ error: 'Request not found' });
    if (codRequest.status !== 'AWAITING_CONVERSATION') {
      return res.status(400).json({ error: `This request is already in status: ${codRequest.status.replace(/_/g, ' ').toLowerCase()}` });
    }
    codRequest.status = 'PENDING_SELLER_APPROVAL';
    await codRequest.save();

    const { User } = await import('../models/User');
    const admins = await User.find({ role: 'ADMIN' });
    for (const a of admins) {
      await pushNotification({
        userId: a._id,
        type: 'NEW_COD_REQUEST',
        title: 'New COD order request',
        body: `A buyer has requested COD approval for ${codRequest.items.length} item(s).`,
        orderId: null,
      });
    }

    res.json({ codRequest });
  } catch (e) { next(e); }
});

// GET /cod-requests/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const codRequest = await CodRequest.findOne({ _id: req.params.id, userId: req.user!.id })
      .populate('addressId')
      .populate('orderId');
    if (!codRequest) return res.status(404).json({ error: 'Request not found' });
    res.json({ codRequest });
  } catch (e) { next(e); }
});

// GET /cod-requests/me — buyer's own requests (only visible after Conversation Done)
router.get('/me/list', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // V5: COD request becomes visible only after the buyer clicks "Conversation Done"
    // Filter out AWAITING_CONVERSATION status from this list
    const items = await CodRequest.find({
      userId: req.user!.id,
      status: { $ne: 'AWAITING_CONVERSATION' },
    }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});

function buildWhatsAppMessage(codRequest: any, address: any): string {
  const lines = [
    `*New COD Order Request*`,
    `Request ID: ${String(codRequest._id).slice(-6).toUpperCase()}`,
    ``,
    `*Items:*`,
    ...codRequest.items.map((i: any, idx: number) =>
      `${idx + 1}. ${i.title}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity} = PKR ${i.priceAtRequest * i.quantity}`
    ),
    ``,
    `*Subtotal:* PKR ${codRequest.subtotal}`,
    `*Discount:* -PKR ${codRequest.discountAmount}`,
    `*Total:* PKR ${codRequest.total}`,
    ``,
    `*Delivery Address:*`,
    address.fullName,
    address.phone,
    address.addressLine,
    `${address.city} ${address.postalCode || ''}`,
    ``,
    `I would like to confirm this COD order. Please verify availability.`,
  ];
  return lines.join('\n');
}

export default router;
