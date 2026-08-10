import { Request, Response } from 'express';
import { Brochure } from '../models/Brochure';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';

/** Pull the uploaded PDF / cover off the request, if either was sent. */
const attachUploads = (req: Request) => {
  const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
  if (!files) return;
  if (files['file']?.[0]) {
    req.body.fileUrl = files['file'][0].path;
    req.body.fileSize = files['file'][0].size;
  }
  if (files['coverImage']?.[0]) {
    req.body.coverImage = files['coverImage'][0].path;
  }
};

export const createBrochure = asyncHandler(async (req: Request, res: Response) => {
  attachUploads(req);
  if (!req.body.fileUrl) {
    return errorResponse(res, 400, 'A brochure PDF is required.');
  }
  const brochure = await Brochure.create(req.body);
  successResponse(res, 201, 'Brochure created successfully', brochure);
});

/**
 * Every brochure, in display order. Like categories and banners, the full list
 * is returned and the storefront filters to PUBLISHED — the admin needs to see
 * its drafts through the same endpoint.
 */
export const getBrochures = asyncHandler(async (_req: Request, res: Response) => {
  const brochures = await Brochure.find().sort({ order: 1, createdAt: -1 });
  successResponse(res, 200, 'Brochures fetched successfully', brochures);
});

export const updateBrochure = asyncHandler(async (req: Request, res: Response) => {
  const existing = await Brochure.findById(req.params.id);
  if (!existing) {
    return errorResponse(res, 404, 'Brochure not found');
  }
  attachUploads(req);
  const brochure = await Brochure.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  successResponse(res, 200, 'Brochure updated successfully', brochure);
});

export const deleteBrochure = asyncHandler(async (req: Request, res: Response) => {
  const brochure = await Brochure.findByIdAndDelete(req.params.id);
  if (!brochure) {
    return errorResponse(res, 404, 'Brochure not found');
  }
  successResponse(res, 200, 'Brochure deleted successfully', null);
});
