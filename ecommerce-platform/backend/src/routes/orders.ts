import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { OrderMessage } from '../models/OrderMessage';
import { OrderEvent } from '../models/OrderEvent';
import { Product } from '../models/Product';
import { CodRequest } from '../models/CodRequest';
import { Address } from '../models/Address';
import { Cart } from '../models/Cart';
import { authenticate, AuthenticatedRequest, requireBuyer } from '../middleware/auth';
import { computeEffectivePrice } from '../utils/pricing';
import { pushNotification } from '../services/notificationService';
import { logOrderEvent } from '../services/orderEventService';

const router = Router();
router.use(authenticate, requireBuyer);

// POST /orders — COD only (card/wallet removed)
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.status(400).json({
      error: 'Card and wallet payments are no longer supported. Please use the COD (Cash on Delivery) checkout flow.',
      code: 'COD_ONLY',
    });
  } catch (e) { next(e); }
});

// GET /me/orders
router.get('/me/list', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await Order.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    const enriched = await Promise.all(orders.map(async (o) => {
      const unread = await OrderMessage.countDocuments({
        orderId: o._id,
        senderRole: 'SELLER',
        readByBuyer: false,
      });
      return { ...o.toObject(), unreadCount: unread };
    }));
    res.json({ items: enriched });
  } catch (e) { next(e); }
});

// GET /orders/:id — includes activity log
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id })
      .populate('addressId')
      .populate('codRequestId');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // PRD_New V3: fetch activity log (newest first)
    const events = await OrderEvent.find({ orderId: order._id }).sort({ createdAt: -1 });
    res.json({ order, events });
  } catch (e) { next(e); }
});

// GET /orders/:id/messages
router.get('/:id/messages', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
      return res.json({ items: [] });
    }
    const messages = await OrderMessage.find({ orderId: order._id }).sort({ createdAt: 1 });
    await OrderMessage.updateMany(
      { orderId: order._id, senderRole: 'SELLER', readByBuyer: false },
      { $set: { readByBuyer: true } }
    );
    res.json({ items: messages });
  } catch (e) { next(e); }
});

// POST /orders/:id/messages
router.post('/:id/messages', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status)) {
      return res.status(400).json({ error: 'Chat is closed for this order' });
    }
    if (!['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status)) {
      return res.status(400).json({ error: 'Chat unlocks once the order is confirmed' });
    }

    const msg = await OrderMessage.create({
      orderId: order._id,
      senderRole: 'BUYER',
      senderId: req.user!.id,
      message: message.trim(),
      readByBuyer: true,
      readBySeller: false,
    });

    // PRD_New V3: log the message event
    await logOrderEvent({
      orderId: String(order._id),
      type: 'MESSAGE_SENT',
      actorRole: 'BUYER',
      actorId: req.user!.id,
      message: 'Buyer sent a message',
    });

    res.status(201).json({ message: msg });
  } catch (e) { next(e); }
});

export default router;
