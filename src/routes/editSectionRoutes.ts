import express from 'express';
import { getEditSections, updateEditSections } from '../controllers/editSectionController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();
router.get('/', getEditSections);
router.put('/', protect, authorize('admin', 'superadmin'), updateEditSections);
export default router;
