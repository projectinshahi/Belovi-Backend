"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ENV = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/belovi-db',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    // Zoho Campaigns (newsletter). DC is the data-center suffix for the account
    // that issued the OAuth token — India accounts use "in" (accounts.zoho.in /
    // campaigns.zoho.in), others use "com", "eu", "com.au", "jp".
    ZOHO_DC: process.env.ZOHO_DC || 'in',
    ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID || '',
    ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET || '',
    ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN || '',
    ZOHO_LIST_KEY: process.env.ZOHO_LIST_KEY || '',
};
//# sourceMappingURL=env.js.map