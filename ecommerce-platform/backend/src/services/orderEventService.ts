import { OrderEvent, OrderEventType } from '../models/OrderEvent';

/**
 * PRD_New V3 §Chronological Ordering — Order Activity Log.
 * Logs every status-changing event for an order as a timeline entry.
 * Newest events appear at the top (enforced by index).
 */
export async function logOrderEvent(input: {
  orderId: string | import('mongoose').Types.ObjectId;
  type: OrderEventType;
  actorRole: 'BUYER' | 'SELLER' | 'SYSTEM';
  actorId?: string | import('mongoose').Types.ObjectId | null;
  message: string;
  metadata?: any;
}): Promise<void> {
  await OrderEvent.create({
    orderId: input.orderId,
    type: input.type,
    actorRole: input.actorRole,
    actorId: input.actorId || null,
    message: input.message,
    metadata: input.metadata || {},
  });
}
