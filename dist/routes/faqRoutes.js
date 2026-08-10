"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const faqController_1 = require("../controllers/faqController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Public route
router.get('/', faqController_1.getPublicFaqs);
// Admin routes
router.use(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'));
router.route('/admin')
    .get(faqController_1.getAdminFaqs)
    .post(faqController_1.createFaq);
router.route('/admin/:id')
    .put(faqController_1.updateFaq)
    .delete(faqController_1.deleteFaq);
router.patch('/admin/:id/toggle', faqController_1.toggleFaqStatus);
exports.default = router;
//# sourceMappingURL=faqRoutes.js.map