"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getCategories = exports.createCategory = exports.MAX_CATEGORIES = void 0;
const Category_1 = require("../models/Category");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
/**
 * Ceiling on categories. The storefront's Shop menu and pill rail are laid out
 * for a bounded set, so the cap is enforced here — at the API — not only in the
 * admin UI, which a direct POST would bypass.
 */
exports.MAX_CATEGORIES = 8;
/**
 * Rejects a name already spoken for, so the studio gets "already exists" instead
 * of Mongo's E11000. `excludeId` lets an edit keep its own name.
 *
 * The unique index on the model is still the guarantee — this is the message.
 */
const nameTaken = async (name, excludeId) => {
    const existing = await Category_1.Category.findOne({ name }).select('_id').lean();
    return !!existing && String(existing._id) !== excludeId;
};
exports.createCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const count = await Category_1.Category.countDocuments();
    if (count >= exports.MAX_CATEGORIES) {
        return (0, responseHandler_1.errorResponse)(res, 400, `A maximum of ${exports.MAX_CATEGORIES} categories is allowed. Delete one to add another.`);
    }
    const name = String(req.body.name || '').trim();
    if (await nameTaken(name)) {
        return (0, responseHandler_1.errorResponse)(res, 400, `"${name}" already exists. Edit the existing one rather than adding a second.`);
    }
    if (req.file) {
        req.body.image = req.file.path;
    }
    const category = await Category_1.Category.create(req.body);
    (0, responseHandler_1.successResponse)(res, 201, 'Category created successfully', category);
});
exports.getCategories = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const categories = await Category_1.Category.find().sort({ createdAt: -1 });
    (0, responseHandler_1.successResponse)(res, 200, 'Categories fetched successfully', categories);
});
exports.updateCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    let category = await Category_1.Category.findById(req.params.id);
    if (!category) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Category not found');
    }
    const name = String(req.body.name || '').trim();
    if (name && (await nameTaken(name, req.params.id))) {
        return (0, responseHandler_1.errorResponse)(res, 400, `"${name}" already exists.`);
    }
    if (req.file) {
        req.body.image = req.file.path;
    }
    category = await Category_1.Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    (0, responseHandler_1.successResponse)(res, 200, 'Category updated successfully', category);
});
exports.deleteCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const category = await Category_1.Category.findByIdAndDelete(req.params.id);
    if (!category) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Category not found');
    }
    (0, responseHandler_1.successResponse)(res, 200, 'Category deleted successfully', null);
});
//# sourceMappingURL=categoryController.js.map