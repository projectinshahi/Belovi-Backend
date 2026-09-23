"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVideo = exports.updateVideo = exports.createVideo = exports.getVideos = void 0;
const Video_1 = require("../models/Video");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
const youtube_1 = require("../utils/youtube");
/** An optional price: blank means none (null), anything else must be a number ≥ 0. */
const readPrice = (v) => {
    if (v === undefined || v === null || v === '')
        return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
};
/**
 * Only these fields are accepted from a request; `youtubeId` is always derived
 * here, so a link the storefront could not play never reaches it.
 */
const readVideo = (body) => {
    const name = String(body.name ?? '').trim();
    const url = String(body.url ?? '').trim();
    if (!name)
        return { error: 'A video name is required.' };
    const youtubeId = (0, youtube_1.parseYouTubeId)(url);
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
exports.getVideos = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const videos = await Video_1.Video.find().sort({ createdAt: -1 });
    (0, responseHandler_1.successResponse)(res, 200, 'Videos fetched successfully', videos);
});
exports.createVideo = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { data, error } = readVideo(req.body);
    if (!data)
        return (0, responseHandler_1.errorResponse)(res, 400, error);
    const video = await Video_1.Video.create(data);
    (0, responseHandler_1.successResponse)(res, 201, 'Video added successfully', video);
});
exports.updateVideo = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { data, error } = readVideo(req.body);
    if (!data)
        return (0, responseHandler_1.errorResponse)(res, 400, error);
    const video = await Video_1.Video.findByIdAndUpdate(req.params.id, data, {
        new: true,
        runValidators: true,
    });
    if (!video)
        return (0, responseHandler_1.errorResponse)(res, 404, 'Video not found');
    (0, responseHandler_1.successResponse)(res, 200, 'Video updated successfully', video);
});
exports.deleteVideo = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const video = await Video_1.Video.findByIdAndDelete(req.params.id);
    if (!video)
        return (0, responseHandler_1.errorResponse)(res, 404, 'Video not found');
    (0, responseHandler_1.successResponse)(res, 200, 'Video deleted successfully', null);
});
//# sourceMappingURL=videoController.js.map