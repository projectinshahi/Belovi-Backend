import mongoose, { Document, Schema } from 'mongoose';

/** Heading of the homepage "The Edit" category grid — one singleton document. */
export interface ICategorySection extends Document {
  eyebrow: string;
  heading: string;
  shopLabel: string;
  shopHref: string;
}

const categorySectionSchema = new Schema<ICategorySection>(
  {
    eyebrow: { type: String, default: 'The Edit' },
    heading: { type: String, default: 'Find your way in.' },
    shopLabel: { type: String, default: 'Shop All' },
    shopHref: { type: String, default: '/products' },
  },
  { timestamps: true }
);

export const CategorySection = mongoose.model<ICategorySection>('CategorySection', categorySectionSchema);

export async function getOrCreateCategorySection() {
  return (await CategorySection.findOne()) || (await CategorySection.create({}));
}
