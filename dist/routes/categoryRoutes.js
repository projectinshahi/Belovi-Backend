"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const categoryController_1 = require("../controllers/categoryController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = express_1.default.Router();
// Catalog writes are admin-only; reads stay public.
const adminOnly = [authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin')];
router.route('/')
    .post(...adminOnly, uploadMiddleware_1.upload.single('imageFile'), categoryController_1.createCategory)
    .get(categoryController_1.getCategories);
router.route('/:id')
    .put(...adminOnly, uploadMiddleware_1.upload.single('imageFile'), categoryController_1.updateCategory)
    .delete(...adminOnly, categoryController_1.deleteCategory);
exports.default = router;
//# sourceMappingURL=categoryRoutes.js.map