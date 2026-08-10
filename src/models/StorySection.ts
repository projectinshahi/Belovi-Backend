import mongoose, { Document, Schema } from 'mongoose';

/**
 * One content block on the storefront Story page. A single flexible collection
 * covers every block the admin can add — a `type` discriminates which fields
 * the storefront renders, so new section kinds don't need new tables.
 *
 * All content fields are optional: a half-filled block still saves as a draft
 * and simply renders whatever it has, matching the storefront's "omit, never
 * show an empty heading" rule.
 */
export type StorySectionType =
  | 'hero'
  | 'founders-note'
  | 'text'
  | 'image'
  | 'gallery'
  | 'quote'
  | 'timeline'
  | 'cta';

export interface ITimelineItem {
  label: string;
  text: string;
}

export interface IStorySection extends Document {
  type: StorySectionType;
  eyebrow?: string;
  title?: string;
  body?: string;
  tagline?: string;
  image?: string;
  images: string[];
  imageAlt?: string;
  /** image on the left of the text (default: right) */
  imageLeft: boolean;
  quote?: string;
  quoteAuthor?: string;
  timeline: ITimelineItem[];
  ctaLabel?: string;
  ctaHref?: string;
  order: number;
  status: 'DRAFT' | 'PUBLISHED';
}

const timelineItemSchema = new Schema<ITimelineItem>(
  {
    label: { type: String, trim: true, default: '' },
    text: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const storySectionSchema = new Schema<IStorySection>(
  {
    type: {
      type: String,
      required: true,
      enum: ['hero', 'founders-note', 'text', 'image', 'gallery', 'quote', 'timeline', 'cta'],
      default: 'text',
    },
    eyebrow: { type: String, trim: true },
    title: { type: String, trim: true },
    body: { type: String },
    tagline: { type: String, trim: true },
    image: { type: String, trim: true },
    images: { type: [String], default: [] },
    imageAlt: { type: String, trim: true },
    imageLeft: { type: Boolean, default: false },
    quote: { type: String },
    quoteAuthor: { type: String, trim: true },
    timeline: { type: [timelineItemSchema], default: [] },
    ctaLabel: { type: String, trim: true },
    ctaHref: { type: String, trim: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
  },
  { timestamps: true }
);

export const StorySection = mongoose.model<IStorySection>('StorySection', storySectionSchema);
