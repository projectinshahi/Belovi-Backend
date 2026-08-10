"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const studioNoteController_1 = require("../controllers/studioNoteController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.get('/', studioNoteController_1.getStudioNote);
router.put('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), studioNoteController_1.updateStudioNote);
exports.default = router;
//# sourceMappingURL=studioNoteRoutes.js.map