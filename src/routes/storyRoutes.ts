import express from 'express';
import {
  getPublicStory,
  getAdminStory,
  createStorySection,
  updateStorySection,
  deleteStorySection,
  toggleStorySection,
  reorderStorySections,
  updateStorySettings,
} from '../controllers/storyController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

// Writes are admin-only; the public feed stays open.
const adminOnly = [protect, authorize('admin', 'superadmin')];

// Section blocks may carry one primary image plus a gallery of up to 12.
const sectionUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'galleryImages', maxCount: 12 },
]);

// Public storefront feed + admin full feed.
router.get('/', getPublicStory);
router.get('/admin', ...adminOnly, getAdminStory);

// Page-level SEO / intro settings.
router.put('/settings', ...adminOnly, updateStorySettings);

// Reorder MUST be declared before '/sections/:id' or ':id' captures "reorder".
router.put('/sections/reorder', ...adminOnly, reorderStorySections);

router.post('/sections', ...adminOnly, sectionUpload, createStorySection);
router.put('/sections/:id', ...adminOnly, sectionUpload, updateStorySection);
router.patch('/sections/:id/toggle', ...adminOnly, toggleStorySection);
router.delete('/sections/:id', ...adminOnly, deleteStorySection);

export default router;
