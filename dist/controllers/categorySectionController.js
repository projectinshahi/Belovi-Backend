"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategorySection = exports.getCategorySection = void 0;
const CategorySection_1 = require("../models/CategorySection");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
exports.getCategorySection = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    (0, responseHandler_1.successResponse)(res, 200, 'Category section fetched', await (0, CategorySection_1.getOrCreateCategorySection)());
});
exports.updateCategorySection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const heading = typeof req.body.heading === 'string' ? req.body.heading.trim() : '';
    if (!heading)
        return (0, responseHandler_1.errorResponse)(res, 400, 'A heading is required.');
    const section = await (0, CategorySection_1.getOrCreateCategorySection)();
    section.heading = heading;
    const { eyebrow, shopLabel, shopHref } = req.body;
    if (eyebrow !== undefined)
        section.eyebrow = eyebrow;
    if (shopLabel !== undefined)
        section.shopLabel = shopLabel;
    if (shopHref !== undefined)
        section.shopHref = shopHref;
    await section.save();
    (0, responseHandler_1.successResponse)(res, 200, 'Category section updated', section);
});
//# sourceMappingURL=categorySectionController.js.map