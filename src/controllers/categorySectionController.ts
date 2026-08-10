import { Request, Response } from 'express';
import { getOrCreateCategorySection } from '../models/CategorySection';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';

export const getCategorySection = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, 200, 'Category section fetched', await getOrCreateCategorySection());
});

export const updateCategorySection = asyncHandler(async (req: Request, res: Response) => {
  const heading = typeof req.body.heading === 'string' ? req.body.heading.trim() : '';
  if (!heading) return errorResponse(res, 400, 'A heading is required.');
  const section = await getOrCreateCategorySection();
  section.heading = heading;
  const { eyebrow, shopLabel, shopHref } = req.body;
  if (eyebrow !== undefined) section.eyebrow = eyebrow;
  if (shopLabel !== undefined) section.shopLabel = shopLabel;
  if (shopHref !== undefined) section.shopHref = shopHref;
  await section.save();
  successResponse(res, 200, 'Category section updated', section);
});
