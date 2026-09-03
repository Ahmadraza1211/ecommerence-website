import mongoose, { Schema, Document } from 'mongoose';

export type CodRequestStatus =
  | 'AWAITING_CONVERSATION'
  | 'PENDING_SELLER_APPROVAL'
  | 'ACCEPTED'
  | 'REJECTED';

export interface ICodRequestItem {
  variantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  title: string;
  variantLabel: string;
  quantity: number;
  priceAtRequest: number;
}

export interface ICodRequest extends Document {
  userId: mongoose.Types.ObjectId;
  addressId: mongoose.Types.ObjectId;
  status: CodRequestStatus;
  items: ICodRequestItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  rejectionReason?: string;
  stockHeldUntil?: Date;
  orderId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  decidedAt?: Date | null;
  updatedAt: Date;
}

const codRequestSchema = new Schema<ICodRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    addressId: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
    status: {
      type: String,
      enum: ['AWAITING_CONVERSATION', 'PENDING_SELLER_APPROVAL', 'ACCEPTED', 'REJECTED'],
      default: 'AWAITING_CONVERSATION',
      index: true,
    },
    items: [
      {
        variantId: { type: Schema.Types.ObjectId, required: true },
        productId: { type: Schema.Types.ObjectId, required: true },
        title: { type: String, required: true },
        variantLabel: { type: String, default: '' },
        quantity: { type: Number, required: true, min: 1 },
        priceAtRequest: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    rejectionReason: { type: String, default: '' },
    stockHeldUntil: { type: Date, default: null },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const CodRequest = mongoose.model<ICodRequest>('CodRequest', codRequestSchema);
