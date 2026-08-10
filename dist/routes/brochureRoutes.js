"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const brochureController_1 = require("../controllers/brochureController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = express_1.default.Router();
// Writes are admin-only; reads stay public.
const adminOnly = [authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin')];
// `file` is the PDF, `coverImage` the optional artwork.
const files = uploadMiddleware_1.uploadBrochure.fields([
    { name: 'file', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
]);
router.route('/').post(...adminOnly, files, brochureController_1.createBrochure).get(brochureController_1.getBrochures);
router
    .route('/:id')
    .put(...adminOnly, files, brochureController_1.updateBrochure)
    .delete(...adminOnly, brochureController_1.deleteBrochure);
exports.default = router;
//# sourceMappingURL=brochureRoutes.js.map