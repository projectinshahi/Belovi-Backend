import mongoose, { Document, Schema } from 'mongoose';

/**
 * A downloadable brochure / lookbook offered on the storefront.
 *
 * The PDF itself lives on Cloudinary (`raw` resource) — `fileUrl` is the direct
 * link. `coverImage` is optional: a brochure with no cover still renders as a
 * card, it just shows the tone placeholder instead of artwork.
 *
 * DRAFT brochures are invisible to the storefront, so the studio can stage a
 * new edition before its launch date.
 */
export interface IBrochure extends Document {
  title: string;
  description?: string;
  fileUrl: string;
  coverImage?: string;
  /** Bytes, as reported at upload — rendered as "PDF · 2.4 MB" on the card. */
  fileSize?: number;
  order: number;
  status: 'DRAFT' | 'PUBLISHED';
}

const brochureSchema = new Schema<IBrochure>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    coverImage: { type: String, trim: true },
    fileSize: { type: Number },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'PUBLISHED' },
  },
  { timestamps: true }
);

export const Brochure = mongoose.model<IBrochure>('Brochure', brochureSchema);
