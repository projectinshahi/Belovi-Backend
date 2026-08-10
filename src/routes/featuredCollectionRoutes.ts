import express from 'express';
import { getFeaturedCollection, updateFeaturedCollection } from '../controllers/featuredCollectionController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

router.get('/', getFeaturedCollection);
router.put('/', protect, authorize('admin'), upload.fields([{ name: 'imageFiles', maxCount: 5 }]), updateFeaturedCollection);

export default router;
