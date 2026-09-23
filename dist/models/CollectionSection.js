"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionSection = exports.COLLECTION_DEFAULTS = exports.LIMITS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.LIMITS = { heading: 80, description: 800, alt: 120, minImages: 1, maxImages: 20 };
/** Paths under /images/ are the storefront's own bundled files. */
exports.COLLECTION_DEFAULTS = {
    heading: 'Collection',
    description: 'Tantra Chair a sculptural statement piece designed to bring comfort, elegance, and versatility into your space. Its distinctive curves provide a supportive, relaxing form while adding a bold contemporary touch to any interior. Crafted for both visual appeal and everyday comfort, the Tantra Chair turns every moment of sitting into a refined experience.',
    mainImage: '/images/Component 6.png',
    images: [
        { image: '/images/collection/tantra-off-white.png', alt: 'Tantra Chair in off-white' },
        { image: '/images/collection/tantra-magenta.png', alt: 'Tantra Chair in magenta' },
        { image: '/images/collection/tantra-tangerine.png', alt: 'Tantra Chair in tangerine' },
    ],
};
const collectionImageSchema = new mongoose_1.Schema({
    image: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, maxlength: exports.LIMITS.alt, default: '' },
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', default: null },
});
const collectionSectionSchema = new mongoose_1.Schema({
    heading: { type: String, required: true, trim: true, maxlength: exports.LIMITS.heading },
    description: { type: String, required: true, trim: true, maxlength: exports.LIMITS.description },
    mainImage: { type: String, required: true, trim: true },
    images: {
        type: [collectionImageSchema],
        validate: {
            validator: (v) => v.length >= exports.LIMITS.minImages && v.length <= exports.LIMITS.maxImages,
            message: `Add between ${exports.LIMITS.minImages} and ${exports.LIMITS.maxImages} scrolling images.`,
        },
    },
}, { timestamps: true });
exports.CollectionSection = mongoose_1.default.model('CollectionSection', collectionSectionSchema);
//# sourceMappingURL=CollectionSection.js.map