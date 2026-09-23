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
exports.FeaturedCollection = void 0;
exports.getOrCreateFeaturedCollection = getOrCreateFeaturedCollection;
const mongoose_1 = __importStar(require("mongoose"));
const DEFAULTS = {
    eyebrow: 'Featured',
    heading: 'Featured Collection',
    description: '',
    ctaLabel: 'View All Pieces',
    ctaHref: '/products',
    isVisible: true,
};
/**
 * Cards keep their default `_id`.
 *
 * Position is still the ORDERING — the array is stored in display order and the
 * admin reorders by moving entries within it, so there is no `order` field
 * duplicating that fact. But position cannot be the IDENTITY: each card has its
 * own listing page at `/collections/<id>`, and a URL that meant a different
 * collection every time the studio reordered the rail would break every link
 * ever shared. The id is what survives reordering and retitling.
 */
const featuredCardSchema = new mongoose_1.Schema({
    products: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }],
    image: { type: String, default: '' },
    badge: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    subtitle: { type: String, default: '', trim: true },
});
const featuredCollectionSchema = new mongoose_1.Schema({
    eyebrow: { type: String, default: DEFAULTS.eyebrow },
    heading: { type: String, default: DEFAULTS.heading },
    description: { type: String, default: DEFAULTS.description },
    ctaLabel: { type: String, default: DEFAULTS.ctaLabel },
    ctaHref: { type: String, default: DEFAULTS.ctaHref },
    isVisible: { type: Boolean, default: DEFAULTS.isVisible },
    cards: { type: [featuredCardSchema], default: [] },
}, { timestamps: true });
exports.FeaturedCollection = mongoose_1.default.model('FeaturedCollection', featuredCollectionSchema);
async function getOrCreateFeaturedCollection() {
    return (await exports.FeaturedCollection.findOne()) || (await exports.FeaturedCollection.create({}));
}
//# sourceMappingURL=FeaturedCollection.js.map