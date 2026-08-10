import express from 'express';
import { getAboutPage, updateAboutPage } from '../controllers/aboutController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

router.get('/', getAboutPage);
router.put(
  '/',
  protect,
  authorize('admin', 'superadmin'),
  // upload.any() so a new image slot on the About form needs no route change.
  upload.any(),
  updateAboutPage
);

export default router;
