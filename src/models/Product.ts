import mongoose, { Document, Schema } from 'mongoose';
import { Category } from './Category';

/**
 * The five fixed categories, always offered. They drive the storefront's Shop
 * menu and cannot be created, renamed or deleted from anywhere in the admin.
 *
 * Mirrored by `SHOP_CATEGORIES` in the admin (products/_components/types.ts) and
 * the storefront (lib/categories.ts) — `check-categories.mjs` asserts the three
 * copies agree.
 */
export const SHOP_CATEGORIES = [
  'Luxury Furniture',
  'Positioning',
  'Wellness',
  'Accessories',
  'All Products',
] as const;

interface IVariant {
  size: string;
  price: number;
  oldPrice?: number;
  color?: string;
  material?: string;
  images: string[];
}

export interface ISpec {
  label: string;
  value: string;
}

export interface IProduct extends Document {
  name: string;
  category: string;
  description?: string;
  variants: IVariant[];
  starRating: number;
  reviewsCount: number;
  offerText?: string;
  images: string[];
  status: string;
  showOnLandingPage: boolean;
  collectionName?: string;
  season?: string;
  lifeMode?: string;
  editSection?: string;
  limited?: boolean;
  
  // Furniture Fields
  dimensions?: string;
  materials?: string[];
  warranty?: string;
  features?: string[];
  specifications?: ISpec[];
  careInstructions?: string;
  shippingReturns?: string;
  relatedProducts?: mongoose.Types.ObjectId[];
}

const specSchema = new Schema<ISpec>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const variantSchema = new Schema<IVariant>({
  size: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  color: { type: String },
  material: { type: String },
  images: [{ type: String }],
});

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    /**
     * Either one of the five fixed categories, or one the studio created in
     * Category Management. Both appear in the admin's Product Details dropdown,
     * so both are accepted here — and nothing else is.
     *
     * This is the real gate, enforced on create and on update (`runValidators`),
     * so a direct POST can't bypass the dropdown. The fixed names are checked
     * first, which keeps the common case off the database entirely.
     *
     * Existence, not ACTIVE: deactivating a studio category must not make every
     * product already filed under it unsaveable. The dropdown offers active ones.
     */
    category: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: async (name: string) =>
          (SHOP_CATEGORIES as readonly string[]).includes(name) ||
          (await Category.exists({ name })) !== null,
        message: '"{VALUE}" is not a fixed category or one of the studio\'s categories.',
      },
    },
    description: { type: String },
    variants: [variantSchema],
    starRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    offerText: { type: String },
    images: [{ type: String }],
    status: { type: String, default: 'In Stock' },
    showOnLandingPage: { type: Boolean, default: false },
    collectionName: { type: String, trim: true },
    season: { type: String, trim: true },
    lifeMode: { type: String, trim: true },
    editSection: {
      type: String,
      trim: true,
      enum: ['Within', 'Beyond', 'BELOVI Men', 'Archive', ''],
      default: '',
    },
    limited: { type: Boolean, default: false },

    dimensions: { type: String, trim: true },
    materials: [{ type: String }],
    warranty: { type: String, trim: true },
    features: [{ type: String }],
    specifications: { type: [specSchema], default: undefined },
    careInstructions: { type: String, trim: true },
    shippingReturns: { type: String, trim: true },
    relatedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', productSchema);
