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
exports.Product = exports.SHOP_CATEGORIES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const Category_1 = require("./Category");
/**
 * The five fixed categories, always offered. They drive the storefront's Shop
 * menu and cannot be created, renamed or deleted from anywhere in the admin.
 *
 * Mirrored by `SHOP_CATEGORIES` in the admin (products/_components/types.ts) and
 * the storefront (lib/categories.ts) — `check-categories.mjs` asserts the three
 * copies agree.
 */
exports.SHOP_CATEGORIES = [
    'Luxury Furniture',
    'Positioning',
    'Wellness',
    'Accessories',
    'All Products',
];
const specSchema = new mongoose_1.Schema({
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
}, { _id: false });
const variantSchema = new mongoose_1.Schema({
    size: { type: String, required: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    color: { type: String },
    material: { type: String },
    images: [{ type: String }],
});
const productSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    /**
     * Either one of the five fixed categories, or one the studio created in
     * Category Management. Both appear in the admin's Product Details dropdown,
     * so both are accepted here — and nothing else is.
     *
     * This is the real gate, enforced on create and on update (`runValidators`),
     * so a direct POST can't bypass the dropdown. The fixed names are checked
     * first, which keeps the common case off the database entirely.
     *
     * Existence, not ACTIVE: deactivating a studio category must not make every
     * product already filed under it unsaveable. The dropdown offers active ones.
     */
    category: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: async (name) => exports.SHOP_CATEGORIES.includes(name) ||
                (await Category_1.Category.exists({ name })) !== null,
            message: '"{VALUE}" is not a fixed category or one of the studio\'s categories.',
        },
    },
    description: { type: String },
    variants: [variantSchema],
    starRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    offerText: { type: String },
    images: [{ type: String }],
    status: { type: String, default: 'In Stock' },
    showOnLandingPage: { type: Boolean, default: false },
    collectionName: { type: String, trim: true },
    season: { type: String, trim: true },
    lifeMode: { type: String, trim: true },
    editSection: {
        type: String,
        trim: true,
        enum: ['Within', 'Beyond', 'BELOVI Men', 'Archive', ''],
        default: '',
    },
    limited: { type: Boolean, default: false },
    dimensions: { type: String, trim: true },
    materials: [{ type: String }],
    warranty: { type: String, trim: true },
    features: [{ type: String }],
    specifications: { type: [specSchema], default: undefined },
    careInstructions: { type: String, trim: true },
    shippingReturns: { type: String, trim: true },
    relatedProducts: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });
exports.Product = mongoose_1.default.model('Product', productSchema);
//# sourceMappingURL=Product.js.map