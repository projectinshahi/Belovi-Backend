"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const videoController_1 = require("../controllers/videoController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Writes are admin-only; reads stay public.
const adminOnly = [authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin')];
router.route('/').get(videoController_1.getVideos).post(...adminOnly, videoController_1.createVideo);
router.route('/:id').put(...adminOnly, videoController_1.updateVideo).delete(...adminOnly, videoController_1.deleteVideo);
exports.default = router;
//# sourceMappingURL=videoRoutes.js.map