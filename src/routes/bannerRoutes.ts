import express from 'express';
import { createBanner, getBanners, deleteBanner, updateBanner } from '../controllers/bannerController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

// Catalog writes are admin-only; reads stay public.
const adminOnly = [protect, authorize('admin', 'superadmin')];

router.route('/')
  .post(...adminOnly, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), createBanner)
  .get(getBanners);

router.route('/:id')
  .put(...adminOnly, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), updateBanner)
  .delete(...adminOnly, deleteBanner);

export default router;
