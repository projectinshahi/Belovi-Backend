import { Request, Response } from 'express';
import { getOrCreateEditSections } from '../models/EditSectionSettings';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/responseHandler';

// Only the four descriptions are editable — names/order/existence are fixed in code.
const KEYS = ['within', 'beyond', 'furniture', 'archive'] as const;

export const getEditSections = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, 200, 'Edit sections fetched', await getOrCreateEditSections());
});

export const updateEditSections = asyncHandler(async (req: Request, res: Response) => {
  const doc = await getOrCreateEditSections();
  for (const k of KEYS) {
    if (typeof req.body[k] === 'string') (doc as any)[k] = req.body[k].trim();
  }
  await doc.save();
  successResponse(res, 200, 'Edit sections updated', doc);
});
