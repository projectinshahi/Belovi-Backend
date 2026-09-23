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
exports.SiteSettings = void 0;
exports.getOrCreateSiteSettings = getOrCreateSiteSettings;
const mongoose_1 = __importStar(require("mongoose"));
const DEFAULTS = {
    whatsappNumber: '917736830303',
    contactEmail: 'belovi2026@gmail.com',
    contactPhone: '',
    addressLine: '',
    instagramUrl: 'https://www.instagram.com/belovi.in/',
};
const siteSettingsSchema = new mongoose_1.Schema({
    whatsappNumber: { type: String, default: DEFAULTS.whatsappNumber, trim: true },
    contactEmail: { type: String, default: DEFAULTS.contactEmail, trim: true },
    contactPhone: { type: String, default: DEFAULTS.contactPhone, trim: true },
    addressLine: { type: String, default: DEFAULTS.addressLine, trim: true },
    instagramUrl: { type: String, default: DEFAULTS.instagramUrl, trim: true },
}, { timestamps: true });
exports.SiteSettings = mongoose_1.default.model('SiteSettings', siteSettingsSchema);
async function getOrCreateSiteSettings() {
    return (await exports.SiteSettings.findOne()) || (await exports.SiteSettings.create({}));
}
//# sourceMappingURL=SiteSettings.js.map