"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aboutController_1 = require("../controllers/aboutController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = express_1.default.Router();
router.get('/', aboutController_1.getAboutPage);
router.put('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), 
// upload.any() so a new image slot on the About form needs no route change.
uploadMiddleware_1.upload.any(), aboutController_1.updateAboutPage);
exports.default = router;
//# sourceMappingURL=aboutRoutes.js.map