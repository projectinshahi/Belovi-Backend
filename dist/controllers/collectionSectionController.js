"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCollectionSection = exports.getCollectionSection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = require("../models/Product");
const CollectionSection_1 = require("../models/CollectionSection");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
/** A kept image must be an upload (https) or one of the storefront's bundled files. */
const isImageRef = (v) => typeof v === 'string' && (/^https:\/\/\S+$/i.test(v) || /^\/images\/[^\s<>"']+$/.test(v.replace(/ /g, '%20')));
/** Just enough of a linked product to show its name in the admin. */
const LINKED = { path: 'images.product', select: 'name' };
exports.getCollectionSection = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const doc = await CollectionSection_1.CollectionSection.findOne().populate(LINKED);
    (0, responseHandler_1.successResponse)(res, 200, 'Collection section fetched', doc ?? CollectionSection_1.COLLECTION_DEFAULTS);
});
/**
 * One multipart save for the whole section.
 *
 * `images` arrives as JSON, in display order: `[{ image?, alt, file?, product? }]`,
 * where `file` is an index into the uploaded `imageFiles` (a new or replaced
 * image), `image` is the URL an unchanged one already has, and `product` is the
 * id of the piece it links to (empty for no link). Adding, editing,
 * reordering and deleting are all just a different array. `mainImageFile`, when
 * sent, replaces `mainImage`.
 *
 * Everything is validated before anything is written, so a bad request leaves
 * the live section exactly as it was.
 */
exports.updateCollectionSection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const files = (req.files ?? {});
    const uploads = files.imageFiles ?? [];
    const body = req.body;
    const heading = String(body.heading ?? '').trim();
    const description = String(body.description ?? '').trim();
    if (!heading)
        return (0, responseHandler_1.errorResponse)(res, 400, 'A section heading is required.');
    if (heading.length > CollectionSection_1.LIMITS.heading) {
        return (0, responseHandler_1.errorResponse)(res, 400, `The heading must be ${CollectionSection_1.LIMITS.heading} characters or fewer.`);
    }
    if (!description)
        return (0, responseHandler_1.errorResponse)(res, 400, 'A description is required.');
    if (description.length > CollectionSection_1.LIMITS.description) {
        return (0, responseHandler_1.errorResponse)(res, 400, `The description must be ${CollectionSection_1.LIMITS.description} characters or fewer.`);
    }
    const mainImage = files.mainImageFile?.[0]?.path ?? body.mainImage;
    if (!isImageRef(mainImage))
        return (0, responseHandler_1.errorResponse)(res, 400, 'A main image is required.');
    let raw;
    try {
        raw = JSON.parse(String(body.images ?? '[]'));
    }
    catch {
        return (0, responseHandler_1.errorResponse)(res, 400, 'The scrolling images could not be read.');
    }
    if (!Array.isArray(raw))
        return (0, responseHandler_1.errorResponse)(res, 400, 'The scrolling images could not be read.');
    if (raw.length < CollectionSection_1.LIMITS.minImages || raw.length > CollectionSection_1.LIMITS.maxImages) {
        return (0, responseHandler_1.errorResponse)(res, 400, `Add between ${CollectionSection_1.LIMITS.minImages} and ${CollectionSection_1.LIMITS.maxImages} scrolling images.`);
    }
    const images = [];
    for (const [i, item] of raw.entries()) {
        const fromFile = typeof item?.file === 'number' ? uploads[item.file]?.path : undefined;
        const image = fromFile ?? item?.image;
        if (!isImageRef(image))
            return (0, responseHandler_1.errorResponse)(res, 400, `Scrolling image ${i + 1} has no image.`);
        const alt = String(item?.alt ?? '').trim();
        if (alt.length > CollectionSection_1.LIMITS.alt) {
            return (0, responseHandler_1.errorResponse)(res, 400, `Image ${i + 1}'s label must be ${CollectionSection_1.LIMITS.alt} characters or fewer.`);
        }
        const product = item?.product ? String(item.product) : null;
        if (product && !mongoose_1.default.isValidObjectId(product)) {
            return (0, responseHandler_1.errorResponse)(res, 400, `Image ${i + 1} links to a product that does not exist.`);
        }
        images.push({ image, alt, product });
    }
    // Every linked product must still exist, so no image links to a dead page.
    const linked = [...new Set(images.map((i) => i.product).filter((p) => !!p))];
    if (linked.length) {
        const found = await Product_1.Product.countDocuments({ _id: { $in: linked } });
        if (found !== linked.length) {
            return (0, responseHandler_1.errorResponse)(res, 400, 'One of the linked products no longer exists. Choose another.');
        }
    }
    const doc = await CollectionSection_1.CollectionSection.findOneAndUpdate({}, { heading, description, mainImage, images }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).populate(LINKED);
    (0, responseHandler_1.successResponse)(res, 200, 'Collection section saved', doc);
});
//# sourceMappingURL=collectionSectionController.js.map