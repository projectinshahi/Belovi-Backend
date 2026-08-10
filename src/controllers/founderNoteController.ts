import { Request, Response } from 'express';
import { getOrCreateFounderNote } from '../models/FounderNote';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/responseHandler';

export const getFounderNote = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, 200, 'Founder note fetched', await getOrCreateFounderNote());
});

export const updateFounderNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await getOrCreateFounderNote();
  const { eyebrow, heading, body1, body2, signature } = req.body;
  if (eyebrow !== undefined) note.eyebrow = eyebrow;
  if (heading !== undefined) note.heading = heading;
  if (body1 !== undefined) note.body1 = body1;
  if (body2 !== undefined) note.body2 = body2;
  if (signature !== undefined) note.signature = signature;
  // A freshly-uploaded file wins; else an image URL in the body keeps/sets it.
  if (req.file) note.image = req.file.path;
  else if (req.body.image) note.image = req.body.image;
  await note.save();
  successResponse(res, 200, 'Founder note updated', note);
});
