"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBrochure = exports.updateBrochure = exports.getBrochures = exports.createBrochure = void 0;
const Brochure_1 = require("../models/Brochure");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
/** Pull the uploaded PDF / cover off the request, if either was sent. */
const attachUploads = (req) => {
    const files = req.files;
    if (!files)
        return;
    if (files['file']?.[0]) {
        req.body.fileUrl = files['file'][0].path;
        req.body.fileSize = files['file'][0].size;
    }
    if (files['coverImage']?.[0]) {
        req.body.coverImage = files['coverImage'][0].path;
    }
};
exports.createBrochure = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    attachUploads(req);
    if (!req.body.fileUrl) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'A brochure PDF is required.');
    }
    const brochure = await Brochure_1.Brochure.create(req.body);
    (0, responseHandler_1.successResponse)(res, 201, 'Brochure created successfully', brochure);
});
/**
 * Every brochure, in display order. Like categories and banners, the full list
 * is returned and the storefront filters to PUBLISHED — the admin needs to see
 * its drafts through the same endpoint.
 */
exports.getBrochures = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const brochures = await Brochure_1.Brochure.find().sort({ order: 1, createdAt: -1 });
    (0, responseHandler_1.successResponse)(res, 200, 'Brochures fetched successfully', brochures);
});
exports.updateBrochure = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await Brochure_1.Brochure.findById(req.params.id);
    if (!existing) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Brochure not found');
    }
    attachUploads(req);
    const brochure = await Brochure_1.Brochure.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    (0, responseHandler_1.successResponse)(res, 200, 'Brochure updated successfully', brochure);
});
exports.deleteBrochure = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const brochure = await Brochure_1.Brochure.findByIdAndDelete(req.params.id);
    if (!brochure) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Brochure not found');
    }
    (0, responseHandler_1.successResponse)(res, 200, 'Brochure deleted successfully', null);
});
//# sourceMappingURL=brochureController.js.map