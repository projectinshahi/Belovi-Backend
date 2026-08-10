"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const featuredCollectionController_1 = require("../controllers/featuredCollectionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = express_1.default.Router();
router.get('/', featuredCollectionController_1.getFeaturedCollection);
router.put('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), uploadMiddleware_1.upload.fields([{ name: 'imageFiles', maxCount: 5 }]), featuredCollectionController_1.updateFeaturedCollection);
exports.default = router;
//# sourceMappingURL=featuredCollectionRoutes.js.map