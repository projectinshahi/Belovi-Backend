import mongoose, { Document, Schema } from 'mongoose';

/**
 * Optional descriptions for the four FIXED THE EDIT categories. One singleton.
 * Names/order/existence are fixed in code — only these descriptions are editable.
 */
export interface IEditSectionSettings extends Document {
  within: string;
  beyond: string;
  furniture: string;
  archive: string;
}

const DEFAULTS = {
  within:
    'For the identity lived at home — the quiet hours, the unwatched ones. Pieces cut for ease that keep their composure long after the door is closed.',
  beyond:
    'For the life lived outward — ambition, occasion, the casual day out. Pieces built to move with you past the front door and hold their line all the way through.',
  furniture:
    'The founding BELOVI Man archive: botanical embroidery, a single placement, a mandarin collar, a knotted closure. The same three laws, a new set of shoulders.',
  archive:
    'Past seasons and retired placements, kept in circulation while they last. The pieces that defined a chapter, gathered here before they close for good.',
};

const editSectionSchema = new Schema<IEditSectionSettings>(
  {
    within: { type: String, default: DEFAULTS.within },
    beyond: { type: String, default: DEFAULTS.beyond },
    furniture: { type: String, default: DEFAULTS.furniture },
    archive: { type: String, default: DEFAULTS.archive },
  },
  { timestamps: true }
);

export const EditSectionSettings = mongoose.model<IEditSectionSettings>(
  'EditSectionSettings',
  editSectionSchema
);

export async function getOrCreateEditSections() {
  return (await EditSectionSettings.findOne()) || (await EditSectionSettings.create({}));
}
