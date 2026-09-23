"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const collectionSectionController_1 = require("../controllers/collectionSectionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const CollectionSection_1 = require("../models/CollectionSection");
const responseHandler_1 = require("../utils/responseHandler");
const router = express_1.default.Router();
const receive = uploadMiddleware_1.uploadImages.fields([
    { name: 'mainImageFile', maxCount: 1 },
    { name: 'imageFiles', maxCount: CollectionSection_1.LIMITS.maxImages },
]);
/** Multer's own limits surface as 400s the admin can show, not as 500s. */
const files = (req, res, next) => receive(req, res, (err) => {
    if (err instanceof multer_1.default.MulterError) {
        return (0, responseHandler_1.errorResponse)(res, 400, err.code === 'LIMIT_FILE_SIZE' ? `Each image must be under ${uploadMiddleware_1.MAX_IMAGE_MB} MB.` : err.message);
    }
    next(err);
});
router.get('/', collectionSectionController_1.getCollectionSection);
router.put('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin'), files, collectionSectionController_1.updateCollectionSection);
exports.default = router;
//# sourceMappingURL=collectionSectionRoutes.js.map