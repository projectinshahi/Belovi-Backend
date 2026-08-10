"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBrochure = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: async (req, file) => {
        return {
            folder: 'belovi_products',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
        };
    },
});
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});
/**
 * Brochure uploads — a PDF (`file`) plus an optional cover image (`coverImage`)
 * in the same submit.
 *
 * Cloudinary stores documents under `resource_type: 'raw'` and photographs under
 * `image`, so the type is decided per file rather than per multer instance. Raw
 * assets are served at their public_id verbatim, which is why the `.pdf`
 * extension is baked into the id — without it the browser downloads an
 * extensionless blob that Windows refuses to open.
 *
 * Kept separate from `upload` so the product/banner image whitelist never has to
 * be loosened to accept documents.
 */
const brochureStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: async (_req, file) => {
        const isPdf = file.mimetype === 'application/pdf';
        const stamp = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        return isPdf
            ? {
                folder: 'belovi_brochures',
                resource_type: 'raw',
                public_id: `brochure-${stamp}.pdf`,
            }
            : {
                folder: 'belovi_brochure_covers',
                allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                public_id: `cover-${stamp}`,
            };
    },
});
exports.uploadBrochure = (0, multer_1.default)({
    storage: brochureStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // brochures are print-quality PDFs
    fileFilter: (_req, file, cb) => {
        const ok = file.fieldname === 'file'
            ? file.mimetype === 'application/pdf'
            : file.mimetype.startsWith('image/');
        if (!ok) {
            return cb(new Error(file.fieldname === 'file'
                ? 'The brochure must be a PDF.'
                : 'The cover must be an image.'));
        }
        cb(null, true);
    },
});
//# sourceMappingURL=uploadMiddleware.js.map