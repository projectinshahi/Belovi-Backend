import mongoose, { Document, Schema } from 'mongoose';

/**
 * The homepage Collection band, directly below the hero: a heading, a
 * description, one main (lifestyle) image and the row of scrolling images.
 *
 * A singleton. Until the studio first saves it there is no document, and the
 * API answers with `COLLECTION_DEFAULTS`, the content the band shipped with,
 * so the storefront and the admin form both start from what is on the page.
 *
 * Scrolling images are product cut-outs (transparent PNGs work best). The
 * storefront draws each one over the shared white plate artwork itself, so no
 * uploaded file needs the plate baked in.
 */
export interface ICollectionImage {
  image: string;
  alt: string;
}

export interface ICollectionSection extends Document {
  heading: string;
  description: string;
  mainImage: string;
  images: ICollectionImage[];
}

export const LIMITS = { heading: 80, description: 800, alt: 120, minImages: 1, maxImages: 20 };

/** Paths under /images/ are the storefront's own bundled files. */
export const COLLECTION_DEFAULTS = {
  heading: 'Collection',
  description:
    'Tantra Chair a sculptural statement piece designed to bring comfort, elegance, and versatility into your space. Its distinctive curves provide a supportive, relaxing form while adding a bold contemporary touch to any interior. Crafted for both visual appeal and everyday comfort, the Tantra Chair turns every moment of sitting into a refined experience.',
  mainImage: '/images/Component 6.png',
  images: [
    { image: '/images/collection/tantra-off-white.png', alt: 'Tantra Chair in off-white' },
    { image: '/images/collection/tantra-magenta.png', alt: 'Tantra Chair in magenta' },
    { image: '/images/collection/tantra-tangerine.png', alt: 'Tantra Chair in tangerine' },
  ],
};

const collectionImageSchema = new Schema<ICollectionImage>({
  image: { type: String, required: true, trim: true },
  alt: { type: String, trim: true, maxlength: LIMITS.alt, default: '' },
});

const collectionSectionSchema = new Schema<ICollectionSection>(
  {
    heading: { type: String, required: true, trim: true, maxlength: LIMITS.heading },
    description: { type: String, required: true, trim: true, maxlength: LIMITS.description },
    mainImage: { type: String, required: true, trim: true },
    images: {
      type: [collectionImageSchema],
      validate: {
        validator: (v: unknown[]) => v.length >= LIMITS.minImages && v.length <= LIMITS.maxImages,
        message: `Add between ${LIMITS.minImages} and ${LIMITS.maxImages} scrolling images.`,
      },
    },
  },
  { timestamps: true }
);

export const CollectionSection = mongoose.model<ICollectionSection>(
  'CollectionSection',
  collectionSectionSchema
);
