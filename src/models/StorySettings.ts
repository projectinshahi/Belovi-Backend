import mongoose, { Document, Schema } from 'mongoose';

/**
 * Page-level settings for the Story page — one singleton document. SEO fields
 * plus an intro eyebrow/heading the storefront can show above the sections.
 */
export interface IStorySettings extends Document {
  metaTitle?: string;
  metaDescription?: string;
  slug: string;
  introEyebrow?: string;
  introHeading?: string;
  introDescription?: string;
}

const storySettingsSchema = new Schema<IStorySettings>(
  {
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    slug: { type: String, trim: true, default: 'story' },
    introEyebrow: { type: String, trim: true },
    introHeading: { type: String, trim: true },
    introDescription: { type: String, trim: true },
  },
  { timestamps: true }
);

export const StorySettings = mongoose.model<IStorySettings>('StorySettings', storySettingsSchema);

/** There is exactly one settings document; fetch it or lazily create it. */
export async function getOrCreateStorySettings() {
  let settings = await StorySettings.findOne();
  if (!settings) {
    settings = await StorySettings.create({ slug: 'story' });
  }
  return settings;
}
