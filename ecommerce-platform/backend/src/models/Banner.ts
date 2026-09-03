import mongoose, { Schema, Document } from 'mongoose';

export interface IBannerTier {
  _id?: mongoose.Types.ObjectId;
  quantity: number;           // required quantity for this tier (e.g. 2 for "Buy 2")
  discountPercent: number;    // e.g. 20 for 20% off
}

export interface IBanner extends Document {
  imageUrl: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  ctaCategory?: mongoose.Types.ObjectId | null;
  ctaProduct?: mongoose.Types.ObjectId | null;
  dealQuantity?: number | null;
  dealDiscountPercent?: number | null;
  // PRD_New V3 §Banner Bundle Deal: multiple tiers on one banner
  bundleTiers: IBannerTier[];
  startAt: Date;
  endAt: Date;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    imageUrl: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    ctaLink: { type: String, default: '' },
    ctaCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    ctaProduct: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    dealQuantity: { type: Number, default: null },
    dealDiscountPercent: { type: Number, default: null },
    bundleTiers: [{
      quantity: { type: Number, required: true, min: 1 },
      discountPercent: { type: Number, required: true, min: 0, max: 100 },
    }],
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Banner = mongoose.model<IBanner>('Banner', bannerSchema);
