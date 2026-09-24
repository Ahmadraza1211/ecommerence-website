import mongoose, { Schema, Document } from 'mongoose';

export type OrderEventType =
  | 'COD_REQUEST_CREATED'
  | 'COD_REQUEST_ACCEPTED'
  | 'COD_REQUEST_REJECTED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'ORDER_UPDATED'
  | 'MESSAGE_SENT'
  | 'QUANTITY_ADJUSTED';

export interface IOrderEvent extends Document {
  orderId: mongoose.Types.ObjectId;
  type: OrderEventType;
  actorRole: 'BUYER' | 'SELLER' | 'SYSTEM';
  actorId?: mongoose.Types.ObjectId | null;
  message: string;
  metadata?: any;
  createdAt: Date;
}

const orderEventSchema = new Schema<OrderEventDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    type: { type: String, enum: [
      'COD_REQUEST_CREATED', 'COD_REQUEST_ACCEPTED', 'COD_REQUEST_REJECTED',
      'ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY',
      'ORDER_DELIVERED', 'ORDER_CANCELLED', 'ORDER_UPDATED', 'MESSAGE_SENT', 'QUANTITY_ADJUSTED',
    ], required: true },
    actorRole: { type: String, enum: ['BUYER', 'SELLER', 'SYSTEM'], default: 'SYSTEM' },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// PRD_New V3 §Chronological Ordering: newest first
orderEventSchema.index({ orderId: 1, createdAt: -1 });

interface OrderEventDocument extends IOrderEvent {}

export const OrderEvent = mongoose.model<OrderEventDocument>('OrderEvent', orderEventSchema);
