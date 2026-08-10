"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const storyController_1 = require("../controllers/storyController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = express_1.default.Router();
// Writes are admin-only; the public feed stays open.
const adminOnly = [authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'superadmin')];
// Section blocks may carry one primary image plus a gallery of up to 12.
const sectionUpload = uploadMiddleware_1.upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'galleryImages', maxCount: 12 },
]);
// Public storefront feed + admin full feed.
router.get('/', storyController_1.getPublicStory);
router.get('/admin', ...adminOnly, storyController_1.getAdminStory);
// Page-level SEO / intro settings.
router.put('/settings', ...adminOnly, storyController_1.updateStorySettings);
// Reorder MUST be declared before '/sections/:id' or ':id' captures "reorder".
router.put('/sections/reorder', ...adminOnly, storyController_1.reorderStorySections);
router.post('/sections', ...adminOnly, sectionUpload, storyController_1.createStorySection);
router.put('/sections/:id', ...adminOnly, sectionUpload, storyController_1.updateStorySection);
router.patch('/sections/:id/toggle', ...adminOnly, storyController_1.toggleStorySection);
router.delete('/sections/:id', ...adminOnly, storyController_1.deleteStorySection);
exports.default = router;
//# sourceMappingURL=storyRoutes.js.map