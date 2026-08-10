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
exports.Product = exports.CATEGORIES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * The storefront's fixed categories — the Shop menu, the category filters and a
 * piece's Category field all read this one list. It is closed on purpose: the
 * studio files a piece under one of these, it cannot invent, rename or delete
 * them. Mirrored by `CATEGORIES` in the admin (products/_components/types.ts)
 * and the storefront (lib/categories.ts); this schema enum is the real gate,
 * enforced on create and on update (`runValidators`).
 */
exports.CATEGORIES = [
    'Luxury Furniture',
    'Positioning',
    'Wellness',
    'Accessories',
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
    category: { type: String, required: true, enum: [...exports.CATEGORIES] },
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