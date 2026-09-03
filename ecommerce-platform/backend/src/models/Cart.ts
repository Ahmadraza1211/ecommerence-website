import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  variantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  // PRD_New V3 §Banner Bundle Deal: locked bundle deal fields
  isBundleDeal?: boolean;
  bundlePrice?: number;
  bundleBannerId?: mongoose.Types.ObjectId | null;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: [
      {
        variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, default: 1, min: 1 },
        isBundleDeal: { type: Boolean, default: false },
        bundlePrice: { type: Number, default: null },
        bundleBannerId: { type: Schema.Types.ObjectId, ref: 'Banner', default: null },
      },
    ],
  },
  { timestamps: true }
);

export const Cart = mongoose.model<ICart>('Cart', cartSchema);
