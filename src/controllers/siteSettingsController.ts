import { Request, Response } from 'express';
import { getOrCreateSiteSettings } from '../models/SiteSettings';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/responseHandler';

export const getSiteSettings = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, 200, 'Site settings fetched', await getOrCreateSiteSettings());
});

export const updateSiteSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSiteSettings();
  const { whatsappNumber, contactEmail, contactPhone, addressLine, instagramUrl } = req.body;

  if (whatsappNumber !== undefined) {
    // Strip anything that isn't a digit — the admin might paste "+91 77368 30303".
    settings.whatsappNumber = whatsappNumber.replace(/\D/g, '');
  }
  // The rest are display strings; `contactPhone` keeps its spacing on purpose so
  // the card can render "+91 77368 30303" while `tel:` normalises it clientside.
  if (contactEmail !== undefined) settings.contactEmail = contactEmail;
  if (contactPhone !== undefined) settings.contactPhone = contactPhone;
  if (addressLine !== undefined) settings.addressLine = addressLine;
  if (instagramUrl !== undefined) settings.instagramUrl = instagramUrl;

  await settings.save();
  successResponse(res, 200, 'Site settings updated', settings);
});
