import { Router, Response, NextFunction } from 'express';
import { CodRequest } from '../../models/CodRequest';
import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../../middleware/auth';
import { pushNotification } from '../../services/notificationService';
import { decrementStockOnAccept, autoRejectCompetingRequests } from '../../services/stockService';
import { logOrderEvent } from '../../services/orderEventService';
import mongoose from 'mongoose';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /admin/cod-requests
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    const items = await CodRequest.find(filter).sort({ createdAt: -1 }).limit(200)
      .populate('userId', 'name')
      .populate('addressId')
      .populate('orderId');
    res.json({ items });
  } catch (e) { next(e); }
});

// GET /admin/cod-requests/:id
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const codRequest = await CodRequest.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('addressId')
      .populate('orderId');
    if (!codRequest) return res.status(404).json({ error: 'Request not found' });
    res.json({ codRequest });
  } catch (e) { next(e); }
});

// PATCH /admin/cod-requests/:id/items/:variantId
router.patch('/:id/items/:variantId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id, variantId } = req.params;
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });
    const codRequest = await CodRequest.findById(id);
    if (!codRequest) return res.status(404).json({ error: 'Request not found' });
    if (codRequest.status !== 'PENDING_SELLER_APPROVAL') return res.status(400).json({ error: 'Can only adjust quantity on pending requests' });
    const item = codRequest.items.find((i) => String(i.variantId) === String(variantId));
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const product = await Product.findOne({ 'variants._id': new mongoose.Types.ObjectId(variantId) });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const variant = product.variants.find((v) => v._id?.equals(variantId));
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    if (quantity > variant.stockQuantity) return res.status(400).json({ error: `Cannot set quantity to ${quantity} — only ${variant.stockQuantity} in stock` });
    item.quantity = quantity;
    codRequest.total = codRequest.subtotal - codRequest.discountAmount;
    await codRequest.save();
    res.json({ codRequest });
  } catch (e) { next(e); }
});

/**
 * PATCH /admin/cod-requests/:id/accept
 * PRD_New V4: Once accepted, the COD request automatically disappears from
 * the buyer's "Your Cart" pending list (cart query filters by status
 * AWAITING_CONVERSATION / PENDING_SELLER_APPROVAL only).
 */
router.patch('/:id/accept', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const codRequest = await CodRequest.findById(req.params.id);
    if (!codRequest) return res.status(404).json({ error: 'Request not found' });
    if (codRequest.status !== 'PENDING_SELLER_APPROVAL') return res.status(400).json({ error: `Already in status: ${codRequest.status}` });

    const { Product } = await import('../../models/Product');
    for (const item of codRequest.items) {
      const product = await Product.findOne({ 'variants._id': item.variantId });
      if (!product) return res.status(400).json({ error: 'One of the products no longer exists' });
      const variant = product.variants.find((v) => v._id?.equals(item.variantId));
      if (!variant) return res.status(400).json({ error: 'One of the variants no longer exists' });
      if (variant.stockQuantity < item.quantity) return res.status(400).json({ error: `Cannot accept — "${product.title}" only has ${variant.stockQuantity} in stock` });
    }

    await decrementStockOnAccept(codRequest.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));
    codRequest.status = 'ACCEPTED';
    codRequest.decidedAt = new Date();
    await codRequest.save();

    const order = await Order.create({
      userId: codRequest.userId, addressId: codRequest.addressId, status: 'CONFIRMED',
      paymentMethod: 'COD', paymentStatus: 'PENDING', codRequestId: codRequest._id,
      items: codRequest.items.map((i) => ({ variantId: i.variantId, productId: i.productId, title: i.title, variantLabel: i.variantLabel, quantity: i.quantity, priceAtPurchase: i.priceAtRequest })),
      subtotal: codRequest.subtotal, discountAmount: codRequest.discountAmount, shippingFee: 0, tax: 0, total: codRequest.total,
    });
    codRequest.orderId = order._id;
    await codRequest.save();

    await logOrderEvent({ orderId: String(order._id), type: 'COD_REQUEST_ACCEPTED', actorRole: 'SELLER', actorId: req.user!.id, message: 'COD request accepted — order confirmed' });
    await pushNotification({ userId: String(codRequest.userId), type: 'ORDER_ACCEPTED', title: 'Order confirmed', body: `Your COD order has been accepted.`, orderId: order._id });

    const autoRejected = await autoRejectCompetingRequests(codRequest);
    for (const r of autoRejected) {
      await pushNotification({ userId: r.userId, type: 'ORDER_REJECTED', title: 'Order request rejected', body: `Your COD request was auto-rejected — item sold out. ${r.reason}` });
    }
    res.json({ codRequest, order, autoRejectedCount: autoRejected.length });
  } catch (e) { next(e); }
});

/**
 * PATCH /admin/cod-requests/:id/reject
 * PRD_New V4: Once rejected, the COD request automatically disappears from
 * the buyer's "Your Cart" pending list.
 */
router.patch('/:id/reject', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const codRequest = await CodRequest.findById(req.params.id);
    if (!codRequest) return res.status(404).json({ error: 'Request not found' });
    if (codRequest.status !== 'PENDING_SELLER_APPROVAL' && codRequest.status !== 'AWAITING_CONVERSATION') return res.status(400).json({ error: `Already in status: ${codRequest.status}` });
    codRequest.status = 'REJECTED';
    codRequest.rejectionReason = reason || '';
    codRequest.decidedAt = new Date();
    await codRequest.save();
    await pushNotification({ userId: String(codRequest.userId), type: 'ORDER_REJECTED', title: 'Order request rejected', body: `Your COD request was rejected.${reason ? ` Reason: ${reason}` : ''}` });
    res.json({ codRequest });
  } catch (e) { next(e); }
});

export default router;
