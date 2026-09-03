import { Router, Response, NextFunction } from 'express';
import { Order } from '../../models/Order';
import { OrderMessage } from '../../models/OrderMessage';
import { OrderEvent } from '../../models/OrderEvent';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../../middleware/auth';
import { pushNotification } from '../../services/notificationService';
import { restoreStockOnCancel } from '../../services/stockService';
import { logOrderEvent } from '../../services/orderEventService';
import { ApiError } from '../../middleware/error';
import mongoose from 'mongoose';

const router = Router();
router.use(authenticate, requireAdmin);

/**
 * GET /admin/orders
 * PRD_New V3 §Seller Orders.2: Category sidebar now works — accepts categoryId filter.
 * PRD_New V3: shows product name, groups by buyer, time filter, status tabs.
 */
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { status, timeRange, page = '1', limit = '5', categoryId } = req.query;
    const filter: any = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let from: Date;
      if (timeRange === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeRange === '7d') {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === '30d') {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        from = new Date(0);
      }
      filter.createdAt = { $gte: from };
    }

    // PRD_New V3 §Seller Orders.2: categoryId filter — resolve orders containing items in this category
    if (categoryId && categoryId !== 'all') {
      const productsInCategory = await Product.find({ categoryId: new mongoose.Types.ObjectId(String(categoryId)) }).select('_id');
      const productIds = productsInCategory.map((p) => p._id);
      filter['items.productId'] = { $in: productIds };
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 5));
    const skip = (pageNum - 1) * limitNum;

    const [items, total, statusCounts] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum)
        .populate('userId', 'name email phone')
        .populate('addressId'),
      Order.countDocuments(filter),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const enriched = await Promise.all(items.map(async (o) => {
      const firstItem = o.items[0];
      const productName = firstItem?.title || (o.items.length > 1 ? `${firstItem?.title} +${o.items.length - 1} more` : '—');
      const unreadCount = await OrderMessage.countDocuments({
        orderId: o._id,
        senderRole: 'BUYER',
        readBySeller: false,
      });
      // PRD_New V3: resolve category for each order (for sidebar linkage)
      const productIds = o.items.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).select('categoryId');
      const orderCategoryIds = [...new Set(products.map((p) => String(p.categoryId)))];
      return {
        ...o.toObject(),
        productName,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        unreadCount,
        orderCategoryIds,
      };
    }));

    const byBuyer: Record<string, any> = {};
    for (const o of enriched) {
      const key = String(o.userId?._id || 'unknown');
      if (!byBuyer[key]) byBuyer[key] = { buyer: o.userId, orders: [] };
      byBuyer[key].orders.push(o);
    }

    const counts: Record<string, number> = { CONFIRMED: 0, SHIPPED: 0, OUT_FOR_DELIVERY: 0, DELIVERED: 0, CANCELLED: 0 };
    statusCounts.forEach((s: any) => { counts[s._id] = s.count; });

    res.json({
      items: enriched,
      groupedByBuyer: Object.values(byBuyer),
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      statusCounts: counts,
    });
  } catch (e) { next(e); }
});

// GET /admin/orders/:id
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid order ID');
    }
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name')
      .populate('addressId')
      .populate('codRequestId');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // PRD_New V3: fetch activity log (newest first)
    const events = await OrderEvent.find({ orderId: order._id }).sort({ createdAt: -1 });
    res.json({ order, events });
  } catch (e) { next(e); }
});

/**
 * PATCH /admin/orders/:id/status
 * PRD_New V3 §Particular Order.2-4:
 * - "Mark Shipped" is now a specific action (frontend sends exact status, not a dropdown)
 * - "Delivered" only after "Shipped"
 * - Stock return on cancel: only returns this order's items (already correct — verified)
 * - Logs every status change as an OrderEvent
 */
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, rejectionReason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // PRD_New V3: Delivered only after Shipped
    if (status === 'DELIVERED' && order.status !== 'SHIPPED' && order.status !== 'OUT_FOR_DELIVERY') {
      return res.status(400).json({ error: 'An order must be Shipped before it can be marked Delivered' });
    }
    // PRD_New V3: Shipped only after Confirmed
    if (['SHIPPED', 'OUT_FOR_DELIVERY'].includes(status) && !['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status)) {
      return res.status(400).json({ error: 'An order must be Confirmed before it can be Shipped' });
    }
    // PRD_New V3 §Particular Order.3: can't change status after Delivered/Cancelled
    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status)) {
      return res.status(400).json({ error: `This order is already ${order.status.toLowerCase()} and cannot be changed` });
    }

    const previousStatus = order.status;
    order.status = status;
    if (status === 'DELIVERED') {
      order.deliveredAt = new Date();
      order.paymentStatus = order.paymentMethod === 'COD' ? 'PAID' : order.paymentStatus;
    }
    if (status === 'CANCELLED') {
      order.cancelledAt = new Date();
      // PRD_New V3 §Particular Order.4: only return this order's items (verified correct)
      await restoreStockOnCancel(String(order._id));
    }
    await order.save();

    // PRD_New V3: log the event
    const eventMessages: Record<string, string> = {
      SHIPPED: 'Order marked as Shipped by seller',
      OUT_FOR_DELIVERY: 'Order is now Out for Delivery',
      DELIVERED: 'Order marked as Delivered',
      CANCELLED: `Order cancelled${rejectionReason ? ` — ${rejectionReason}` : ''}`,
    };
    if (eventMessages[status]) {
      await logOrderEvent({
        orderId: String(order._id),
        type: status === 'SHIPPED' ? 'ORDER_SHIPPED' :
              status === 'OUT_FOR_DELIVERY' ? 'ORDER_OUT_FOR_DELIVERY' :
              status === 'DELIVERED' ? 'ORDER_DELIVERED' :
              status === 'CANCELLED' ? 'ORDER_CANCELLED' : 'ORDER_CONFIRMED',
        actorRole: 'SELLER',
        actorId: req.user!.id,
        message: eventMessages[status],
      });
    }

    const map: Record<string, { type: any; title: string; body: string }> = {
      SHIPPED: { type: 'ORDER_SHIPPED', title: 'Order shipped', body: `Your order has been shipped.` },
      OUT_FOR_DELIVERY: { type: 'ORDER_OUT_FOR_DELIVERY', title: 'Out for delivery', body: `Your order is out for delivery.` },
      DELIVERED: { type: 'ORDER_DELIVERED', title: 'Order delivered', body: `Your order has been delivered. Please leave a review.` },
      CANCELLED: { type: 'ORDER_CANCELLED', title: 'Order cancelled', body: `Your order was cancelled.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}` },
    };
    if (map[status]) {
      await pushNotification({
        userId: String(order.userId),
        type: map[status].type,
        title: map[status].title,
        body: map[status].body,
        orderId: order._id,
      });
    }
    res.json({ order });
  } catch (e) { next(e); }
});

// GET /admin/orders/:id/messages
router.get('/:id/messages', async (req, res: Response, next: NextFunction) => {
  try {
    const messages = await OrderMessage.find({ orderId: req.params.id }).sort({ createdAt: 1 });
    await OrderMessage.updateMany(
      { orderId: req.params.id, senderRole: 'BUYER', readBySeller: false },
      { $set: { readBySeller: true } }
    );
    res.json({ items: messages });
  } catch (e) { next(e); }
});

// POST /admin/orders/:id/messages
router.post('/:id/messages', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status)) {
      return res.status(400).json({ error: 'Chat is closed for this order' });
    }
    if (!['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status)) {
      return res.status(400).json({ error: 'Chat unlocks once the order is confirmed' });
    }
    const msg = await OrderMessage.create({
      orderId: order._id,
      senderRole: 'SELLER',
      senderId: req.user!.id,
      message: message.trim(),
      readBySeller: true,
      readByBuyer: false,
    });
    // PRD_New V3: log the message event
    await logOrderEvent({
      orderId: String(order._id),
      type: 'MESSAGE_SENT',
      actorRole: 'SELLER',
      actorId: req.user!.id,
      message: `Seller sent a message`,
    });
    res.status(201).json({ message: msg });
  } catch (e) { next(e); }
});

/**
 * GET /admin/orders/unread-summary/overview
 * PRD_New V3: category sidebar now properly links orders to categories.
 */
router.get('/unread-summary/overview', async (_req, res: Response, next: NextFunction) => {
  try {
    const ordersWithUnread = await OrderMessage.aggregate([
      { $match: { senderRole: 'BUYER', readBySeller: false } },
      { $group: { _id: '$orderId' } },
    ]);
    const orderIds = ordersWithUnread.map((o) => o._id);
    const orders = await Order.find({ _id: { $in: orderIds } }).select('items');

    const categoryUnread: Record<string, number> = {};
    for (const o of orders) {
      const productIds = o.items.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).select('categoryId');
      const catIds = [...new Set(products.map((p) => String(p.categoryId)))];
      for (const catId of catIds) {
        categoryUnread[catId] = (categoryUnread[catId] || 0) + 1;
      }
    }
    res.json({ categoryUnread, totalUnreadOrders: orderIds.length });
  } catch (e) { next(e); }
});

export default router;
