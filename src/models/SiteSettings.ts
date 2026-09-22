import mongoose, { Document, Schema } from 'mongoose';

/**
 * Site-wide settings — one singleton document.
 *
 * Anything that was previously hardcoded in the frontend but needs to be
 * admin-editable lives here. The WhatsApp number is the first; add fields
 * as the studio asks for them.
 */
export interface ISiteSettings extends Document {
  /** Digits only, country code first — the form wa.me expects (e.g. "917736830303"). */
  whatsappNumber: string;
  /** Customer-care address shown on the contact surfaces. */
  contactEmail: string;
  /** Display form, e.g. "+91 77368 30303" — `tel:` strips the spacing itself. */
  contactPhone: string;
  /** One-line postal address for the contact card. */
  addressLine: string;
  instagramUrl: string;
}

const DEFAULTS = {
  whatsappNumber: '917736830303',
  contactEmail: 'belovi2026@gmail.com',
  contactPhone: '',
  addressLine: '',
  instagramUrl: 'https://www.instagram.com/belovi.in/',
};

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    whatsappNumber: { type: String, default: DEFAULTS.whatsappNumber, trim: true },
    contactEmail: { type: String, default: DEFAULTS.contactEmail, trim: true },
    contactPhone: { type: String, default: DEFAULTS.contactPhone, trim: true },
    addressLine: { type: String, default: DEFAULTS.addressLine, trim: true },
    instagramUrl: { type: String, default: DEFAULTS.instagramUrl, trim: true },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', siteSettingsSchema);

export async function getOrCreateSiteSettings() {
  return (await SiteSettings.findOne()) || (await SiteSettings.create({}));
}
