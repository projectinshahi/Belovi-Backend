import { Request, Response } from 'express';
import { getOrCreateAboutPage } from '../models/AboutPage';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/responseHandler';

/** Text fields the admin form may set, assigned verbatim when present. */
const TEXT_FIELDS = [
  'introEyebrow',
  'introTitle',
  'introBody',
  'introImage',
  'profileEyebrow',
  'profileTitle',
  'profileBody',
  'profileImage',
  'storyTitle',
  'storyBody',
  'storyImage',
  'visionEyebrow',
  'visionTitle',
  'visionBody',
  'visionImage',
  'showroomEyebrow',
  'showroomTitle',
  'showroomBody',
  'showroomAddress',
  'showroomHours',
  'showroomMapUrl',
  'metaTitle',
  'metaDescription',
] as const;

export const getAboutPage = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, 200, 'About page fetched', await getOrCreateAboutPage());
});

export const updateAboutPage = asyncHandler(async (req: Request, res: Response) => {
  const about = await getOrCreateAboutPage();
  const body = req.body as Record<string, any>;

  for (const field of TEXT_FIELDS) {
    if (body[field] !== undefined) (about as any)[field] = body[field];
  }

  // FormData flattens arrays to strings, so the structured fields arrive
  // JSON-encoded — same revive step productController does.
  for (const field of ['visionPoints', 'showroomImages'] as const) {
    if (typeof body[field] === 'string') {
      try {
        body[field] = JSON.parse(body[field]);
      } catch {
        delete body[field];
      }
    }
    if (Array.isArray(body[field])) (about as any)[field] = body[field];
  }

  // Newly uploaded files win over the URL already in the body. `upload.any()`
  // keeps the field list open so a new image slot needs no route change.
  const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
  for (const file of files) {
    if (file.fieldname === 'introImageFile') about.introImage = file.path;
    else if (file.fieldname === 'profileImageFile') about.profileImage = file.path;
    else if (file.fieldname === 'storyImageFile') about.storyImage = file.path;
    else if (file.fieldname === 'visionImageFile') about.visionImage = file.path;
    else if (file.fieldname === 'showroomImageFiles') {
      about.showroomImages = [...(about.showroomImages || []), file.path];
    }
  }

  await about.save();
  successResponse(res, 200, 'About page updated', about);
});
