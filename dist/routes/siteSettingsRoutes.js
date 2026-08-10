"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const siteSettingsController_1 = require("../controllers/siteSettingsController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.get('/', siteSettingsController_1.getSiteSettings);
router.put('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), siteSettingsController_1.updateSiteSettings);
exports.default = router;
//# sourceMappingURL=siteSettingsRoutes.js.map