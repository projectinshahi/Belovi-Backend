import { Request, Response } from 'express';
import { Banner } from '../models/Banner';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  if (req.files) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files['image']) req.body.image = files['image'][0].path;
    if (files['mobileImage']) req.body.mobileImage = files['mobileImage'][0].path;
  }
  const banner = await Banner.create(req.body);
  successResponse(res, 201, 'Banner created successfully', banner);
});

export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const banners = await Banner.find().sort({ createdAt: -1 });
  successResponse(res, 200, 'Banners fetched successfully', banners);
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  let banner = await Banner.findById(req.params.id);
  if (!banner) {
    return errorResponse(res, 404, 'Banner not found');
  }
  if (req.files) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files['image']) req.body.image = files['image'][0].path;
    if (files['mobileImage']) req.body.mobileImage = files['mobileImage'][0].path;
  }
  banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  successResponse(res, 200, 'Banner updated successfully', banner);
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) {
    return errorResponse(res, 404, 'Banner not found');
  }
  successResponse(res, 200, 'Banner deleted successfully', null);
});
