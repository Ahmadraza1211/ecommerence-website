import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'ORDER_ACCEPTED'
  | 'ORDER_REJECTED'
  | 'ORDER_SHIPPED'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'ORDER_UPDATED'
  | 'NEW_COD_REQUEST'
  | 'NEW_REVIEW'
  | 'GENERIC';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  orderId?: mongoose.Types.ObjectId | null;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: [
      'ORDER_ACCEPTED', 'ORDER_REJECTED', 'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY',
      'ORDER_DELIVERED', 'ORDER_CANCELLED', 'ORDER_UPDATED', 'NEW_COD_REQUEST', 'NEW_REVIEW', 'GENERIC',
    ], default: 'GENERIC' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Compound index so we can quickly fetch unread notifications per user
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
