import { Request, Response } from 'express';
import { Video } from '../models/Video';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';
import { parseYouTubeId } from '../utils/youtube';

/** An optional price: blank means none (null), anything else must be a number ≥ 0. */
const readPrice = (v: unknown): number | null | undefined => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/**
 * Only these fields are accepted from a request; `youtubeId` is always derived
 * here, so a link the storefront could not play never reaches it.
 */
const readVideo = (body: Record<string, unknown>) => {
  const name = String(body.name ?? '').trim();
  const url = String(body.url ?? '').trim();
  if (!name) return { error: 'A video name is required.' };
  const youtubeId = parseYouTubeId(url);
  if (!youtubeId) {
    return { error: 'Enter a valid YouTube link, e.g. https://www.youtube.com/watch?v=…' };
  }

  const productName = String(body.productName ?? '').trim() || null;
  const actualPrice = readPrice(body.actualPrice);
  const offerPrice = readPrice(body.offerPrice);
  if (actualPrice === undefined || offerPrice === undefined) {
    return { error: 'Prices must be numbers of 0 or more.' };
  }
  if (actualPrice !== null && offerPrice !== null && offerPrice > actualPrice) {
    return { error: 'The offer price cannot be higher than the actual price.' };
  }
  return { data: { name, url, youtubeId, productName, actualPrice, offerPrice } };
};

/** Newest first, so a video just added leads the carousel. */
export const getVideos = asyncHandler(async (_req: Request, res: Response) => {
  const videos = await Video.find().sort({ createdAt: -1 });
  successResponse(res, 200, 'Videos fetched successfully', videos);
});

export const createVideo = asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = readVideo(req.body);
  if (!data) return errorResponse(res, 400, error);
  const video = await Video.create(data);
  successResponse(res, 201, 'Video added successfully', video);
});

export const updateVideo = asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = readVideo(req.body);
  if (!data) return errorResponse(res, 400, error);
  const video = await Video.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!video) return errorResponse(res, 404, 'Video not found');
  successResponse(res, 200, 'Video updated successfully', video);
});

export const deleteVideo = asyncHandler(async (req: Request, res: Response) => {
  const video = await Video.findByIdAndDelete(req.params.id);
  if (!video) return errorResponse(res, 404, 'Video not found');
  successResponse(res, 200, 'Video deleted successfully', null);
});
