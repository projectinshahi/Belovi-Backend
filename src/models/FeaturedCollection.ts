import mongoose, { Document, Schema } from 'mongoose';

/**
 * One card in the Featured Collection rail — a named, curated GROUP of pieces.
 *
 * A card is a small collection the studio composes by hand: a badge that names
 * it ("Best seller", "Premium", "New"), a photograph, and the pieces that belong
 * to it. Selecting a card on the storefront shows those pieces together beneath
 * the rail, which is the point of grouping them.
 *
 * `products` is ORDERED. Array position is the order the pieces are shown in, so
 * the studio's arrangement survives — there is no separate sort field, because
 * position already is the fact.
 *
 * `badge` is deliberately unrelated to any product's category: it is the
 * studio's own label for the group, free to say something the catalogue does not.
 *
 * `image`, `title` and `subtitle` are overrides. Left empty, the storefront
 * falls back to the first piece's photograph, its name and its category, so a
 * card can be composed by picking pieces and typing nothing else.
 */
export interface IFeaturedCard {
  /** Mongoose's own, kept: it is this card's listing URL. See the schema below. */
  _id: mongoose.Types.ObjectId;
  /** The pieces in this group, in display order. At least one. */
  products: mongoose.Types.ObjectId[];
  /** Overrides the first piece's photograph. */
  image: string;
  /** The red pill, top right — the studio's own words. */
  badge: string;
  /** Large line in the white panel. Falls back to the first piece's name. */
  title: string;
  /** Red line under it. Falls back to the first piece's category. */
  subtitle: string;
}

export interface IFeaturedCollection extends Document {
  eyebrow: string;
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  isVisible: boolean;
  cards: IFeaturedCard[];
}

const DEFAULTS = {
  eyebrow: 'Featured',
  heading: 'Featured Collection',
  description: '',
  ctaLabel: 'View All Pieces',
  ctaHref: '/products',
  isVisible: true,
};

/**
 * Cards keep their default `_id`.
 *
 * Position is still the ORDERING — the array is stored in display order and the
 * admin reorders by moving entries within it, so there is no `order` field
 * duplicating that fact. But position cannot be the IDENTITY: each card has its
 * own listing page at `/collections/<id>`, and a URL that meant a different
 * collection every time the studio reordered the rail would break every link
 * ever shared. The id is what survives reordering and retitling.
 */
const featuredCardSchema = new Schema<IFeaturedCard>(
  {
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    image: { type: String, default: '' },
    badge: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    subtitle: { type: String, default: '', trim: true },
  }
);

const featuredCollectionSchema = new Schema<IFeaturedCollection>(
  {
    eyebrow: { type: String, default: DEFAULTS.eyebrow },
    heading: { type: String, default: DEFAULTS.heading },
    description: { type: String, default: DEFAULTS.description },
    ctaLabel: { type: String, default: DEFAULTS.ctaLabel },
    ctaHref: { type: String, default: DEFAULTS.ctaHref },
    isVisible: { type: Boolean, default: DEFAULTS.isVisible },
    cards: { type: [featuredCardSchema], default: [] },
  },
  { timestamps: true }
);

export const FeaturedCollection = mongoose.model<IFeaturedCollection>(
  'FeaturedCollection',
  featuredCollectionSchema
);

export async function getOrCreateFeaturedCollection() {
  return (await FeaturedCollection.findOne()) || (await FeaturedCollection.create({}));
}
