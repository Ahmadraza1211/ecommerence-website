import mongoose, { Schema, Document } from 'mongoose';

export interface IAttribute {
  _id?: mongoose.Types.ObjectId;
  name: string;
  isGlobal: boolean;
}

export interface IAttributeValue {
  _id?: mongoose.Types.ObjectId;
  attributeId: mongoose.Types.ObjectId;
  value: string;
  displayMeta?: string; // e.g. hex code for color swatch
}

export interface IVariant {
  _id?: mongoose.Types.ObjectId;
  sku: string;
  stockQuantity: number;
  priceOverride?: number | null;
  imageUrl?: string;
  attributeValues: mongoose.Types.ObjectId[]; // IAttributeValue refs
}

export interface ICustomField {
  name: string;
  value: string;
}

export interface IProduct extends Document {
  title: string;
  slug: string;
  description: string;
  categoryId: mongoose.Types.ObjectId;
  brand?: string;
  basePrice: number;
  discountType: 'PERCENT' | 'FLAT' | null;
  discountValue: number;
  discountStartAt?: Date | null;
  discountEndAt?: Date | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  codEligible: boolean;
  weight?: number;
  material?: string;   // PRD_New §Edit Product.4: Material field on Basic Info
  customFields?: ICustomField[];
  tags: string[];
  images: { url: string; sortOrder: number; isPrimary: boolean }[];
  attributes: IAttribute[];
  attributeValues: IAttributeValue[];
  variants: IVariant[];
  isFeatured: boolean;
  featuredRank?: number | null;
  featuredStartAt?: Date | null;
  featuredEndAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true, index: 'text' },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brand: { type: String, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: ['PERCENT', 'FLAT', null], default: null },
    discountValue: { type: Number, default: 0, min: 0 },
    discountStartAt: { type: Date, default: null },
    discountEndAt: { type: Date, default: null },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'PUBLISHED' },
    codEligible: { type: Boolean, default: true },
    weight: { type: Number, min: 0 },
    material: { type: String, trim: true, default: '' },
    customFields: [
      {
        name: { type: String, trim: true },
        value: { type: String, trim: true },
      },
    ],
    tags: [{ type: String, trim: true }],
    images: [
      {
        url: { type: String, required: true },
        sortOrder: { type: Number, default: 0 },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    attributes: [
      {
        _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
        name: { type: String, required: true },
        isGlobal: { type: Boolean, default: false },
      },
    ],
    attributeValues: [
      {
        attributeId: { type: Schema.Types.ObjectId, required: true },
        value: { type: String, required: true },
        displayMeta: { type: String },
      },
    ],
    variants: [
      {
        sku: { type: String, required: true },
        stockQuantity: { type: Number, default: 0, min: 0 },
        priceOverride: { type: Number, default: null, min: 0 },
        imageUrl: { type: String },
        attributeValues: [{ type: Schema.Types.ObjectId }],
      },
    ],
    isFeatured: { type: Boolean, default: false },
    featuredRank: { type: Number, default: null },
    featuredStartAt: { type: Date, default: null },
    featuredEndAt: { type: Date, default: null },
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Product = mongoose.model<IProduct>('Product', productSchema);
