"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.getProductById = exports.getProducts = exports.createProduct = exports.mergeImageOrder = void 0;
const Product_1 = require("../models/Product");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
/** Mirrors NEW_IMAGE_TOKEN in the admin (products/_components/types.ts). */
const NEW_IMAGE_TOKEN = '__new__';
/**
 * Stitch the admin's ordered `images` array back together with the files it
 * uploaded alongside it. Each NEW_IMAGE_TOKEN takes the next uploaded URL, so
 * a shot picked in this same save can still be `images[0]` — the primary.
 *
 * Uploads with no token left to claim them are appended, which is exactly what
 * a client that sends no tokens at all (the previous behaviour) gets.
 */
const mergeImageOrder = (images, uploaded) => {
    let next = 0;
    const ordered = images
        .map(url => (url === NEW_IMAGE_TOKEN ? uploaded[next++] : url))
        .filter(Boolean);
    return [...ordered, ...uploaded.slice(next)];
};
exports.mergeImageOrder = mergeImageOrder;
// Attach uploaded files to the product (imageFiles) and to each variant (variantImages_<index>)
const attachUploads = (req) => {
    const files = (Array.isArray(req.files) ? req.files : []);
    // FormData flattens everything to strings, so the structured fields arrive
    // JSON-encoded and have to be revived before Mongoose sees them. `variants`
    // has always needed this; `specs`, `careIcons`, `sizeChart` and `materials`
    // are the PDP / merchandising fields.
    for (const field of ['variants', 'specifications', 'careIcons', 'features', 'materials', 'relatedProducts']) {
        if (typeof req.body[field] === 'string') {
            try {
                req.body[field] = JSON.parse(req.body[field]);
            }
            catch {
                // Leave it as-is and let schema validation produce the error.
            }
        }
    }
    /* Product-level images: the admin's ordered list, with uploads slotted in.
     *
     * ONLY when the request actually carries them. This used to run
     * unconditionally, so a save that sent no `images` field wrote an empty array
     * over whatever the piece already had — silently deleting its photographs.
     * A client that does not manage this field must be able to save without
     * destroying it. */
    const productFileUrls = files.filter(f => f.fieldname === 'imageFiles').map(f => f.path);
    const carriesImages = req.body.images !== undefined || productFileUrls.length > 0;
    if (carriesImages) {
        if (typeof req.body.images === 'string') {
            req.body.images = [req.body.images];
        }
        req.body.images = (0, exports.mergeImageOrder)(req.body.images || [], productFileUrls);
    }
    // Per-variant images: merge existing URLs (already in the parsed variant) with uploaded files
    if (Array.isArray(req.body.variants)) {
        req.body.variants = req.body.variants.map((variant, index) => {
            const variantFileUrls = files
                .filter(f => f.fieldname === `variantImages_${index}`)
                .map(f => f.path);
            const existing = Array.isArray(variant.images) ? variant.images : [];
            return { ...variant, images: [...existing, ...variantFileUrls] };
        });
    }
};
exports.createProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    attachUploads(req);
    const product = await Product_1.Product.create(req.body);
    (0, responseHandler_1.successResponse)(res, 201, 'Product created successfully', product);
});
exports.getProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const products = await Product_1.Product.find().sort({ createdAt: -1 }).populate('relatedProducts');
    (0, responseHandler_1.successResponse)(res, 200, 'Products fetched successfully', products);
});
/**
 * One product by id. Public, like `getProducts` — the storefront's size guide
 * needs a single piece's chart and should not have to pull the whole catalogue
 * to find it.
 */
exports.getProductById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    // An id that isn't a valid ObjectId makes findById throw a CastError, which
    // would surface as a 500. A bad id in a URL is a 404, not a server fault.
    const product = await Product_1.Product.findById(req.params.id).populate('relatedProducts').catch(() => null);
    if (!product) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Product not found');
    }
    (0, responseHandler_1.successResponse)(res, 200, 'Product fetched successfully', product);
});
exports.updateProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    let product = await Product_1.Product.findById(req.params.id);
    if (!product) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Product not found');
    }
    attachUploads(req);
    product = await Product_1.Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    (0, responseHandler_1.successResponse)(res, 200, 'Product updated successfully', product);
});
exports.deleteProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const product = await Product_1.Product.findByIdAndDelete(req.params.id);
    if (!product) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Product not found');
    }
    (0, responseHandler_1.successResponse)(res, 200, 'Product deleted successfully', null);
});
//# sourceMappingURL=productController.js.map