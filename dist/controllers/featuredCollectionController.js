"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFeaturedCollection = exports.getFeaturedCollection = void 0;
const FeaturedCollection_1 = require("../models/FeaturedCollection");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
exports.getFeaturedCollection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const collection = await (0, FeaturedCollection_1.getOrCreateFeaturedCollection)();
    // Populate the products to return their full data
    await collection.populate('products');
    (0, responseHandler_1.successResponse)(res, 200, 'Featured Collection fetched successfully', collection);
});
exports.updateFeaturedCollection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const collection = await (0, FeaturedCollection_1.getOrCreateFeaturedCollection)();
    // If there are newly uploaded image files, append them to req.body.images
    if (req.files) {
        const files = req.files;
        if (files['imageFiles'] && files['imageFiles'].length > 0) {
            const uploadedPaths = files['imageFiles'].map(f => f.path);
            // req.body.images can be a string or array of strings if existing images are kept
            let existingImages = [];
            if (req.body.images) {
                if (Array.isArray(req.body.images)) {
                    existingImages = req.body.images;
                }
                else {
                    existingImages = [req.body.images];
                }
            }
            req.body.images = [...existingImages, ...uploadedPaths];
        }
    }
    // Mongoose $set will replace arrays, so req.body.products should be an array of ObjectIds
    if (req.body.products && typeof req.body.products === 'string') {
        try {
            req.body.products = JSON.parse(req.body.products);
        }
        catch (e) {
            // do nothing, let it be
        }
    }
    Object.assign(collection, req.body);
    await collection.save();
    await collection.populate('products');
    (0, responseHandler_1.successResponse)(res, 200, 'Featured Collection updated successfully', collection);
});
//# sourceMappingURL=featuredCollectionController.js.map