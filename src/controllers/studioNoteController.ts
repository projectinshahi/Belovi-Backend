import { Request, Response } from 'express';
import { getOrCreateStudioNote } from '../models/StudioNote';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/responseHandler';

export const getStudioNote = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, 200, 'Studio note fetched', await getOrCreateStudioNote());
});

export const updateStudioNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await getOrCreateStudioNote();
  const { eyebrow, heading, description, ctaLabel, ctaHref } = req.body;
  if (eyebrow !== undefined) note.eyebrow = eyebrow;
  if (heading !== undefined) note.heading = heading;
  if (description !== undefined) note.description = description;
  if (ctaLabel !== undefined) note.ctaLabel = ctaLabel;
  if (ctaHref !== undefined) note.ctaHref = ctaHref;
  await note.save();
  successResponse(res, 200, 'Studio note updated', note);
});
