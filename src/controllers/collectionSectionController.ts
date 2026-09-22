import { Request, Response } from 'express';
import {
  COLLECTION_DEFAULTS,
  CollectionSection,
  LIMITS,
} from '../models/CollectionSection';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';

/** A kept image must be an upload (https) or one of the storefront's bundled files. */
const isImageRef = (v: unknown): v is string =>
  typeof v === 'string' && (/^https:\/\/\S+$/i.test(v) || /^\/images\/[^\s<>"']+$/.test(v.replace(/ /g, '%20')));

export const getCollectionSection = asyncHandler(async (_req: Request, res: Response) => {
  const doc = await CollectionSection.findOne();
  successResponse(res, 200, 'Collection section fetched', doc ?? COLLECTION_DEFAULTS);
});

/**
 * One multipart save for the whole section.
 *
 * `images` arrives as JSON, in display order: `[{ image?, alt, file? }]`, where
 * `file` is an index into the uploaded `imageFiles` (a new or replaced image)
 * and `image` is the URL an unchanged one already has. Adding, editing,
 * reordering and deleting are all just a different array. `mainImageFile`, when
 * sent, replaces `mainImage`.
 *
 * Everything is validated before anything is written, so a bad request leaves
 * the live section exactly as it was.
 */
export const updateCollectionSection = asyncHandler(async (req: Request, res: Response) => {
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  const uploads = files.imageFiles ?? [];
  const body = req.body as Record<string, unknown>;

  const heading = String(body.heading ?? '').trim();
  const description = String(body.description ?? '').trim();
  if (!heading) return errorResponse(res, 400, 'A section heading is required.');
  if (heading.length > LIMITS.heading) {
    return errorResponse(res, 400, `The heading must be ${LIMITS.heading} characters or fewer.`);
  }
  if (!description) return errorResponse(res, 400, 'A description is required.');
  if (description.length > LIMITS.description) {
    return errorResponse(res, 400, `The description must be ${LIMITS.description} characters or fewer.`);
  }

  const mainImage = files.mainImageFile?.[0]?.path ?? body.mainImage;
  if (!isImageRef(mainImage)) return errorResponse(res, 400, 'A main image is required.');

  let raw: unknown;
  try {
    raw = JSON.parse(String(body.images ?? '[]'));
  } catch {
    return errorResponse(res, 400, 'The scrolling images could not be read.');
  }
  if (!Array.isArray(raw)) return errorResponse(res, 400, 'The scrolling images could not be read.');
  if (raw.length < LIMITS.minImages || raw.length > LIMITS.maxImages) {
    return errorResponse(
      res,
      400,
      `Add between ${LIMITS.minImages} and ${LIMITS.maxImages} scrolling images.`
    );
  }

  const images: { image: string; alt: string }[] = [];
  for (const [i, item] of (raw as Record<string, unknown>[]).entries()) {
    const fromFile = typeof item?.file === 'number' ? uploads[item.file]?.path : undefined;
    const image = fromFile ?? item?.image;
    if (!isImageRef(image)) return errorResponse(res, 400, `Scrolling image ${i + 1} has no image.`);
    const alt = String(item?.alt ?? '').trim();
    if (alt.length > LIMITS.alt) {
      return errorResponse(res, 400, `Image ${i + 1}'s label must be ${LIMITS.alt} characters or fewer.`);
    }
    images.push({ image, alt });
  }

  const doc = await CollectionSection.findOneAndUpdate(
    {},
    { heading, description, mainImage, images },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  successResponse(res, 200, 'Collection section saved', doc);
});
