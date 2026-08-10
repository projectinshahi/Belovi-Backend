"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const founderNoteController_1 = require("../controllers/founderNoteController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = express_1.default.Router();
router.get('/', founderNoteController_1.getFounderNote);
router.put('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), uploadMiddleware_1.upload.single('image'), founderNoteController_1.updateFounderNote);
exports.default = router;
//# sourceMappingURL=founderNoteRoutes.js.map