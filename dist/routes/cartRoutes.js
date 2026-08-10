"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cartController_1 = require("../controllers/cartController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// All cart routes require authentication
router.use(authMiddleware_1.protect);
router.route('/')
    .get(cartController_1.getCart)
    .post(cartController_1.addToCart)
    .delete(cartController_1.clearCart); // Delete whole cart or clear items
// Merge a guest cart into the user's cart after login
router.post('/merge', cartController_1.mergeCart);
router.route('/item')
    .put(cartController_1.updateCartItem)
    .delete(cartController_1.removeFromCart); // Requires body { productId, size }
exports.default = router;
//# sourceMappingURL=cartRoutes.js.map