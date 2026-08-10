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
exports.StorySettings = void 0;
exports.getOrCreateStorySettings = getOrCreateStorySettings;
const mongoose_1 = __importStar(require("mongoose"));
const storySettingsSchema = new mongoose_1.Schema({
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    slug: { type: String, trim: true, default: 'story' },
    introEyebrow: { type: String, trim: true },
    introHeading: { type: String, trim: true },
    introDescription: { type: String, trim: true },
}, { timestamps: true });
exports.StorySettings = mongoose_1.default.model('StorySettings', storySettingsSchema);
/** There is exactly one settings document; fetch it or lazily create it. */
async function getOrCreateStorySettings() {
    let settings = await exports.StorySettings.findOne();
    if (!settings) {
        settings = await exports.StorySettings.create({ slug: 'story' });
    }
    return settings;
}
//# sourceMappingURL=StorySettings.js.map