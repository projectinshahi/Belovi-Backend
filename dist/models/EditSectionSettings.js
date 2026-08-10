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
exports.EditSectionSettings = void 0;
exports.getOrCreateEditSections = getOrCreateEditSections;
const mongoose_1 = __importStar(require("mongoose"));
const DEFAULTS = {
    within: 'For the identity lived at home — the quiet hours, the unwatched ones. Pieces cut for ease that keep their composure long after the door is closed.',
    beyond: 'For the life lived outward — ambition, occasion, the casual day out. Pieces built to move with you past the front door and hold their line all the way through.',
    furniture: 'The founding BELOVI Man archive: botanical embroidery, a single placement, a mandarin collar, a knotted closure. The same three laws, a new set of shoulders.',
    archive: 'Past seasons and retired placements, kept in circulation while they last. The pieces that defined a chapter, gathered here before they close for good.',
};
const editSectionSchema = new mongoose_1.Schema({
    within: { type: String, default: DEFAULTS.within },
    beyond: { type: String, default: DEFAULTS.beyond },
    furniture: { type: String, default: DEFAULTS.furniture },
    archive: { type: String, default: DEFAULTS.archive },
}, { timestamps: true });
exports.EditSectionSettings = mongoose_1.default.model('EditSectionSettings', editSectionSchema);
async function getOrCreateEditSections() {
    return (await exports.EditSectionSettings.findOne()) || (await exports.EditSectionSettings.create({}));
}
//# sourceMappingURL=EditSectionSettings.js.map