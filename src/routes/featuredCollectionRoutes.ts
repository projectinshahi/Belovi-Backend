import express from 'express';
import { getFeaturedCollection, updateFeaturedCollection } from '../controllers/featuredCollectionController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

router.get('/', getFeaturedCollection);
// `any()` rather than a fixed field list: card photographs arrive as repeated
// `cardImages` entries whose count is however many cards the studio added.
router.put('/', protect, authorize('admin'), upload.any(), updateFeaturedCollection);

export default router;
