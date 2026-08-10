import express from 'express';
import { getFounderNote, updateFounderNote } from '../controllers/founderNoteController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();
router.get('/', getFounderNote);
router.put('/', protect, authorize('admin', 'superadmin'), upload.single('image'), updateFounderNote);
export default router;
