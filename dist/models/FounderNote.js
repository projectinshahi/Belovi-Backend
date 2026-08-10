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
exports.FounderNote = void 0;
exports.getOrCreateFounderNote = getOrCreateFounderNote;
const mongoose_1 = __importStar(require("mongoose"));
const DEFAULTS = {
    eyebrow: "Founder's Note · Q3, At-Home & Monsoon",
    heading: 'The monsoon makes certain truths obvious.',
    body1: 'Fabric either lets you breathe or it does not. A dress either stays with the body through a wet afternoon, or it begins to fight it. This season we kept returning to pieces that hold their line in humidity and still feel quiet enough for the life most women are actually living.',
    body2: 'BELOVI is not interested in clothing that asks for performance. It is interested in clothing that lets a woman look like herself — with more ease, and more precision, than before.',
    signature: '— BELOVI',
    image: '/images/saree-with-wome20.png',
};
const founderNoteSchema = new mongoose_1.Schema({
    eyebrow: { type: String, default: DEFAULTS.eyebrow },
    heading: { type: String, default: DEFAULTS.heading },
    body1: { type: String, default: DEFAULTS.body1 },
    body2: { type: String, default: DEFAULTS.body2 },
    signature: { type: String, default: DEFAULTS.signature },
    image: { type: String, default: DEFAULTS.image },
}, { timestamps: true });
exports.FounderNote = mongoose_1.default.model('FounderNote', founderNoteSchema);
async function getOrCreateFounderNote() {
    return (await exports.FounderNote.findOne()) || (await exports.FounderNote.create({}));
}
//# sourceMappingURL=FounderNote.js.map