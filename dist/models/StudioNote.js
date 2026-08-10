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
exports.StudioNote = void 0;
exports.getOrCreateStudioNote = getOrCreateStudioNote;
const mongoose_1 = __importStar(require("mongoose"));
const DEFAULTS = {
    eyebrow: "Story · Studio Notes — The Designer's Eye",
    heading: 'The line begins where weather, body and proportion meet.',
    description: "Every BELOVI piece is shaped through three questions: does it serve the woman over forty, will it breathe in heat and monsoon air, and does it give her identity without asking her to perform. Nineteen years of an interior designer's eye, turned toward clothing.",
    ctaLabel: 'View the Collection',
    ctaHref: '/products',
};
const studioNoteSchema = new mongoose_1.Schema({
    eyebrow: { type: String, default: DEFAULTS.eyebrow },
    heading: { type: String, default: DEFAULTS.heading },
    description: { type: String, default: DEFAULTS.description },
    ctaLabel: { type: String, default: DEFAULTS.ctaLabel },
    ctaHref: { type: String, default: DEFAULTS.ctaHref },
}, { timestamps: true });
exports.StudioNote = mongoose_1.default.model('StudioNote', studioNoteSchema);
async function getOrCreateStudioNote() {
    return (await exports.StudioNote.findOne()) || (await exports.StudioNote.create({}));
}
//# sourceMappingURL=StudioNote.js.map