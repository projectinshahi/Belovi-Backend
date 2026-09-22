import mongoose, { Document, Schema } from 'mongoose';

/**
 * A YouTube video in the homepage Video Showcase.
 *
 * `url` is kept exactly as the admin pasted it, so the edit form shows it back;
 * `youtubeId` is derived from it on every save and is all the storefront needs
 * — thumbnail and player are both built from the id.
 *
 * The product fields are optional and shown over the card when set. A cleared
 * field is stored as null, so an edit can remove it.
 */
export interface IVideo extends Document {
  name: string;
  url: string;
  youtubeId: string;
  productName?: string | null;
  actualPrice?: number | null;
  offerPrice?: number | null;
}

const videoSchema = new Schema<IVideo>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true },
    youtubeId: { type: String, required: true, match: /^[\w-]{11}$/ },
    productName: { type: String, trim: true, maxlength: 120, default: null },
    actualPrice: { type: Number, min: 0, default: null },
    offerPrice: { type: Number, min: 0, default: null },
  },
  { timestamps: true }
);

export const Video = mongoose.model<IVideo>('Video', videoSchema);
