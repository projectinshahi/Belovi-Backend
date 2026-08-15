import mongoose, { Document, Schema } from 'mongoose';

/**
 * The About Us page — one singleton document, five authored blocks:
 * intro, company profile, story, vision, showroom.
 *
 * Flat fields rather than nested objects: the admin edits them in one form, and
 * `Object.assign` from a multipart body then works without walking a tree.
 *
 * The story block used to be absent here, on the reasoning that the About page
 * rendered the StorySection feed instead. The redesign gives About its own
 * single story block with its own photograph, so `story*` now lives alongside
 * the others; the StorySection feed is untouched and still drives /story.
 *
 * Every field is optional and every block on the storefront omits itself when
 * empty, so an unfilled About page renders as a shorter page, never a broken one.
 */
export interface IVisionPoint {
  label: string;
  text: string;
}

export interface IAboutPage extends Document {
  // Intro
  introEyebrow?: string;
  introTitle?: string;
  introBody?: string;
  introImage?: string;

  // Company profile
  profileEyebrow?: string;
  profileTitle?: string;
  profileBody?: string;
  profileImage?: string;

  // Story
  storyTitle?: string;
  storyBody?: string;
  storyImage?: string;

  // Vision
  visionEyebrow?: string;
  visionTitle?: string;
  visionBody?: string;
  visionImage?: string;
  visionPoints: IVisionPoint[];

  // Showroom
  showroomEyebrow?: string;
  showroomTitle?: string;
  showroomBody?: string;
  showroomAddress?: string;
  showroomHours?: string;
  /** Google Maps *embed* URL (the `src` of the iframe on Share → Embed a map). */
  showroomMapUrl?: string;
  showroomImages: string[];

  // SEO
  metaTitle?: string;
  metaDescription?: string;
}

const visionPointSchema = new Schema<IVisionPoint>(
  {
    label: { type: String, trim: true, default: '' },
    text: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const aboutPageSchema = new Schema<IAboutPage>(
  {
    introEyebrow: { type: String, trim: true },
    introTitle: { type: String, trim: true },
    introBody: { type: String },
    introImage: { type: String, trim: true },

    profileEyebrow: { type: String, trim: true },
    profileTitle: { type: String, trim: true },
    profileBody: { type: String },
    profileImage: { type: String, trim: true },

    storyTitle: { type: String, trim: true },
    storyBody: { type: String },
    storyImage: { type: String, trim: true },

    visionEyebrow: { type: String, trim: true },
    visionTitle: { type: String, trim: true },
    visionBody: { type: String },
    visionImage: { type: String, trim: true },
    visionPoints: { type: [visionPointSchema], default: [] },

    showroomEyebrow: { type: String, trim: true },
    showroomTitle: { type: String, trim: true },
    showroomBody: { type: String },
    showroomAddress: { type: String, trim: true },
    showroomHours: { type: String, trim: true },
    showroomMapUrl: { type: String, trim: true },
    showroomImages: { type: [String], default: [] },

    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
  },
  { timestamps: true }
);

export const AboutPage = mongoose.model<IAboutPage>('AboutPage', aboutPageSchema);

/** There is exactly one About document; fetch it or lazily create it. */
export async function getOrCreateAboutPage() {
  return (await AboutPage.findOne()) || (await AboutPage.create({}));
}
