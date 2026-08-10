"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const validation_1 = require("../middlewares/validation");
const router = express_1.default.Router();
router.route('/profile')
    .get(authMiddleware_1.protect, userController_1.getProfile)
    .put(authMiddleware_1.protect, (0, validation_1.validate)(validation_1.schemas.updateProfile), userController_1.updateProfile);
router.route('/addresses')
    .get(authMiddleware_1.protect, userController_1.getAddresses)
    .post(authMiddleware_1.protect, (0, validation_1.validate)(validation_1.schemas.addAddress), userController_1.addAddress);
router.route('/addresses/:addressId')
    .put(authMiddleware_1.protect, (0, validation_1.validate)(validation_1.schemas.addAddress), userController_1.editAddress)
    .delete(authMiddleware_1.protect, userController_1.deleteAddress);
// Admin routes
router.get('/admin/customers', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), userController_1.getAllCustomers);
router.put('/admin/customers/:id/toggle-status', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), userController_1.toggleCustomerStatus);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map