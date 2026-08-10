"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = express_1.default.Router();
// Catalog writes are admin-only; reads stay public.
const adminOnly = [authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin')];
// upload.any() accepts the product's `imageFiles` plus per-variant `variantImages_<index>` fields
router.route('/')
    .post(...adminOnly, uploadMiddleware_1.upload.any(), productController_1.createProduct)
    .get(productController_1.getProducts);
router.route('/:id')
    .get(productController_1.getProductById)
    .put(...adminOnly, uploadMiddleware_1.upload.any(), productController_1.updateProduct)
    .delete(...adminOnly, productController_1.deleteProduct);
exports.default = router;
//# sourceMappingURL=productRoutes.js.map