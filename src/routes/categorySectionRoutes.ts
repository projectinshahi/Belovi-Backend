import express from 'express';
import { getCategorySection, updateCategorySection } from '../controllers/categorySectionController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();
router.get('/', getCategorySection);
router.put('/', protect, authorize('admin', 'superadmin'), updateCategorySection);
export default router;
