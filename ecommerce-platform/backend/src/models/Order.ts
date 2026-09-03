import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus =
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentMethod = 'COD' | 'CARD' | 'WALLET';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface IOrderItem {
  variantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  title: string;
  variantLabel: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  addressId: mongoose.Types.ObjectId;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  codRequestId?: mongoose.Types.ObjectId | null;
  items: IOrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  tax: number;
  total: number;
  trackingNumber?: string;
  courierName?: string;
  deliveredAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    addressId: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
    status: {
      type: String,
      enum: ['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
      default: 'CONFIRMED',
      index: true,
    },
    paymentMethod: { type: String, enum: ['COD', 'CARD', 'WALLET'], default: 'COD' },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    codRequestId: { type: Schema.Types.ObjectId, ref: 'CodRequest', default: null },
    items: [
      {
        variantId: { type: Schema.Types.ObjectId, required: true },
        productId: { type: Schema.Types.ObjectId, required: true },
        title: { type: String, required: true },
        variantLabel: { type: String, default: '' },
        quantity: { type: Number, required: true, min: 1 },
        priceAtPurchase: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    trackingNumber: { type: String, default: '' },
    courierName: { type: String, default: '' },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', orderSchema);
