import express from 'express';
import { getStudioNote, updateStudioNote } from '../controllers/studioNoteController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();
router.get('/', getStudioNote);
router.put('/', protect, authorize('admin', 'superadmin'), updateStudioNote);
export default router;
