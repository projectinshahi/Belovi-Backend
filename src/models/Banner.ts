import mongoose, { Document, Schema } from 'mongoose';

export interface IBanner extends Document {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  mobileImage: string;
  status: string;
}

const bannerSchema = new Schema<IBanner>(
  {
    eyebrow: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    ctaLabel: { type: String, trim: true },
    ctaHref: { type: String, trim: true },
    image: { type: String, required: true },
    mobileImage: { type: String },
    status: { type: String, default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Banner = mongoose.model<IBanner>('Banner', bannerSchema);
