import mongoose, { Document, Schema } from 'mongoose';

export interface IFeaturedCollection extends Document {
  eyebrow: string;
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  isVisible: boolean;
  products: mongoose.Types.ObjectId[];
  images: string[];
}

const DEFAULTS = {
  eyebrow: 'Featured',
  heading: 'Featured Collection',
  description: '',
  ctaLabel: 'View All Pieces',
  ctaHref: '/products',
  isVisible: true,
  products: [],
  images: [],
};

const featuredCollectionSchema = new Schema<IFeaturedCollection>(
  {
    eyebrow: { type: String, default: DEFAULTS.eyebrow },
    heading: { type: String, default: DEFAULTS.heading },
    description: { type: String, default: DEFAULTS.description },
    ctaLabel: { type: String, default: DEFAULTS.ctaLabel },
    ctaHref: { type: String, default: DEFAULTS.ctaHref },
    isVisible: { type: Boolean, default: DEFAULTS.isVisible },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product', default: [] }],
    images: { type: [String], default: DEFAULTS.images },
  },
  { timestamps: true }
);

export const FeaturedCollection = mongoose.model<IFeaturedCollection>('FeaturedCollection', featuredCollectionSchema);

export async function getOrCreateFeaturedCollection() {
  return (await FeaturedCollection.findOne()) || (await FeaturedCollection.create({}));
}
