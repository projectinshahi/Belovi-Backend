"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const validation_1 = require("../middlewares/validation");
const router = express_1.default.Router();
router.post('/create-order', authMiddleware_1.protect, (0, validation_1.validate)(validation_1.schemas.createOrder), paymentController_1.createOrder);
// NOTE: /verify is intentionally left to its HMAC signature check + Mongoose
// validators. Its payload (mock-payment ids, mapped shipping address) is too
// variable for the static zod schema without risking rejection of valid orders.
router.post('/verify', authMiddleware_1.protect, paymentController_1.verifyPayment);
router.get('/myorders', authMiddleware_1.protect, paymentController_1.getMyOrders);
// Admin routes
router.get('/admin/orders', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), paymentController_1.getAllOrders);
router.get('/admin/customers/:id/orders', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), paymentController_1.getCustomerOrders);
router.put('/admin/orders/:id/status', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), paymentController_1.updateOrderStatus);
exports.default = router;
//# sourceMappingURL=paymentRoutes.js.map