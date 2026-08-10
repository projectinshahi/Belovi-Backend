import mongoose, { Document, Schema } from 'mongoose';

/** The homepage / story "Founder's Note" block — one singleton document. */
export interface IFounderNote extends Document {
  eyebrow: string;
  heading: string;
  body1: string;
  body2: string;
  signature: string;
  image: string;
}

const DEFAULTS = {
  eyebrow: "Founder's Note · Q3, At-Home & Monsoon",
  heading: 'The monsoon makes certain truths obvious.',
  body1:
    'Fabric either lets you breathe or it does not. A dress either stays with the body through a wet afternoon, or it begins to fight it. This season we kept returning to pieces that hold their line in humidity and still feel quiet enough for the life most women are actually living.',
  body2:
    'BELOVI is not interested in clothing that asks for performance. It is interested in clothing that lets a woman look like herself — with more ease, and more precision, than before.',
  signature: '— BELOVI',
  image: '/images/saree-with-wome20.png',
};

const founderNoteSchema = new Schema<IFounderNote>(
  {
    eyebrow: { type: String, default: DEFAULTS.eyebrow },
    heading: { type: String, default: DEFAULTS.heading },
    body1: { type: String, default: DEFAULTS.body1 },
    body2: { type: String, default: DEFAULTS.body2 },
    signature: { type: String, default: DEFAULTS.signature },
    image: { type: String, default: DEFAULTS.image },
  },
  { timestamps: true }
);

export const FounderNote = mongoose.model<IFounderNote>('FounderNote', founderNoteSchema);

export async function getOrCreateFounderNote() {
  return (await FounderNote.findOne()) || (await FounderNote.create({}));
}
