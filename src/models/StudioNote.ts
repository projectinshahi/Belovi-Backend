import mongoose, { Document, Schema } from 'mongoose';

/** The homepage "Studio Notes" block (id="story") — one singleton document. */
export interface IStudioNote extends Document {
  eyebrow: string;
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

const DEFAULTS = {
  eyebrow: "Story · Studio Notes — The Designer's Eye",
  heading: 'The line begins where weather, body and proportion meet.',
  description:
    "Every BELOVI piece is shaped through three questions: does it serve the woman over forty, will it breathe in heat and monsoon air, and does it give her identity without asking her to perform. Nineteen years of an interior designer's eye, turned toward clothing.",
  ctaLabel: 'View the Collection',
  ctaHref: '/products',
};

const studioNoteSchema = new Schema<IStudioNote>(
  {
    eyebrow: { type: String, default: DEFAULTS.eyebrow },
    heading: { type: String, default: DEFAULTS.heading },
    description: { type: String, default: DEFAULTS.description },
    ctaLabel: { type: String, default: DEFAULTS.ctaLabel },
    ctaHref: { type: String, default: DEFAULTS.ctaHref },
  },
  { timestamps: true }
);

export const StudioNote = mongoose.model<IStudioNote>('StudioNote', studioNoteSchema);

export async function getOrCreateStudioNote() {
  return (await StudioNote.findOne()) || (await StudioNote.create({}));
}
