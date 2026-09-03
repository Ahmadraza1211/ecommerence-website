import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderMessage extends Document {
  orderId: mongoose.Types.ObjectId;
  senderRole: 'BUYER' | 'SELLER';
  senderId: mongoose.Types.ObjectId;
  message: string;
  readAt?: Date | null;
  // PRD_New §Notification Badges: per-role read tracking so we can compute unread counts
  readByBuyer: boolean;   // has the buyer seen this message?
  readBySeller: boolean;  // has the seller seen this message?
  createdAt: Date;
  updatedAt: Date;
}

const orderMessageSchema = new Schema<IOrderMessage>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    senderRole: { type: String, enum: ['BUYER', 'SELLER'], required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
    readByBuyer: { type: Boolean, default: false },
    readBySeller: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for fast unread-count queries
orderMessageSchema.index({ orderId: 1, senderRole: 1, readByBuyer: 1 });
orderMessageSchema.index({ orderId: 1, senderRole: 1, readBySeller: 1 });

export const OrderMessage = mongoose.model<IOrderMessage>('OrderMessage', orderMessageSchema);
