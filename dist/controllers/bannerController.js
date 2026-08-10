"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBanner = exports.updateBanner = exports.getBanners = exports.createBanner = void 0;
const Banner_1 = require("../models/Banner");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
exports.createBanner = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (req.files) {
        const files = req.files;
        if (files['image'])
            req.body.image = files['image'][0].path;
        if (files['mobileImage'])
            req.body.mobileImage = files['mobileImage'][0].path;
    }
    const banner = await Banner_1.Banner.create(req.body);
    (0, responseHandler_1.successResponse)(res, 201, 'Banner created successfully', banner);
});
exports.getBanners = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const banners = await Banner_1.Banner.find().sort({ createdAt: -1 });
    (0, responseHandler_1.successResponse)(res, 200, 'Banners fetched successfully', banners);
});
exports.updateBanner = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    let banner = await Banner_1.Banner.findById(req.params.id);
    if (!banner) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Banner not found');
    }
    if (req.files) {
        const files = req.files;
        if (files['image'])
            req.body.image = files['image'][0].path;
        if (files['mobileImage'])
            req.body.mobileImage = files['mobileImage'][0].path;
    }
    banner = await Banner_1.Banner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    (0, responseHandler_1.successResponse)(res, 200, 'Banner updated successfully', banner);
});
exports.deleteBanner = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const banner = await Banner_1.Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Banner not found');
    }
    (0, responseHandler_1.successResponse)(res, 200, 'Banner deleted successfully', null);
});
//# sourceMappingURL=bannerController.js.map