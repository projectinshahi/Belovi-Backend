import mongoose, { Document, Schema } from 'mongoose';

import { Category } from './Category';

/**
 * The house limit on the two free-text fields the product page renders.
 *
 * 200 characters is roughly two lines of the PDP's 480px copy column, which is
 * what the design allows before the description starts pushing the buy button
 * off a laptop screen. Applied per FEATURE, not across the list — a piece may
 * carry several, each its own short line.
 *
 * This is the gate. The admin stops typing at the same number and the storefront
 * lays out for it, but a direct POST reaches here, and `runValidators` on update
 * means an edit is checked too. Mirrored by MAX_DESCRIPTION / MAX_FEATURE in the
 * admin (products/_components/types.ts).
 */
export const MAX_DESCRIPTION = 200;
export const MAX_FEATURE = 200;

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
     * A category the studio created in Category Management, and nothing else —
     * exactly what the admin's dropdown offers. This is the real gate, enforced
     * on create and on update (`runValidators`), so a direct POST can't bypass
     * that dropdown.
     *
     * There is no fixed list to check first any more, so this always asks the
     * database. That is the point: the categories a piece can carry and the
     * categories the storefront links to are now literally the same rows, so a
     * piece cannot be filed somewhere no shopper can reach.
     *
     * Existence, not ACTIVE: switching a category off must not make every
     * product already filed under it unsaveable. The dropdown offers active ones.
     */
    category: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: async (name: string) => (await Category.exists({ name })) !== null,
        message: '"{VALUE}" is not one of the studio\'s categories.',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [MAX_DESCRIPTION, `The description cannot exceed ${MAX_DESCRIPTION} characters.`],
    },
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
    features: [
      {
        type: String,
        trim: true,
        maxlength: [MAX_FEATURE, `A feature cannot exceed ${MAX_FEATURE} characters.`],
      },
    ],
    specifications: { type: [specSchema], default: undefined },
    careInstructions: { type: String, trim: true },
    shippingReturns: { type: String, trim: true },
    relatedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', productSchema);
