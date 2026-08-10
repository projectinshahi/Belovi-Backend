"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const newsletterController_1 = require("../controllers/newsletterController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const validation_1 = require("../middlewares/validation");
const router = express_1.default.Router();
// Public — subscribe to "Notes from the Studio"
router.post('/subscribe', (0, validation_1.validate)(validation_1.schemas.subscribe), newsletterController_1.subscribe);
// Admin — manage subscribers
router.get('/admin', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), newsletterController_1.getSubscribers);
router.delete('/admin/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), newsletterController_1.deleteSubscriber);
exports.default = router;
//# sourceMappingURL=newsletterRoutes.js.map