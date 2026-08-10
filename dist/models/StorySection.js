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
exports.StorySection = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const timelineItemSchema = new mongoose_1.Schema({
    label: { type: String, trim: true, default: '' },
    text: { type: String, trim: true, default: '' },
}, { _id: false });
const storySectionSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
        enum: ['hero', 'founders-note', 'text', 'image', 'gallery', 'quote', 'timeline', 'cta'],
        default: 'text',
    },
    eyebrow: { type: String, trim: true },
    title: { type: String, trim: true },
    body: { type: String },
    tagline: { type: String, trim: true },
    image: { type: String, trim: true },
    images: { type: [String], default: [] },
    imageAlt: { type: String, trim: true },
    imageLeft: { type: Boolean, default: false },
    quote: { type: String },
    quoteAuthor: { type: String, trim: true },
    timeline: { type: [timelineItemSchema], default: [] },
    ctaLabel: { type: String, trim: true },
    ctaHref: { type: String, trim: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
}, { timestamps: true });
exports.StorySection = mongoose_1.default.model('StorySection', storySectionSchema);
//# sourceMappingURL=StorySection.js.map