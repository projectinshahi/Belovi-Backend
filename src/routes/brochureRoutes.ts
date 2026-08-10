import express from 'express';
import {
  createBrochure,
  getBrochures,
  updateBrochure,
  deleteBrochure,
} from '../controllers/brochureController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { uploadBrochure } from '../middlewares/uploadMiddleware';

const router = express.Router();

// Writes are admin-only; reads stay public.
const adminOnly = [protect, authorize('admin', 'superadmin')];

// `file` is the PDF, `coverImage` the optional artwork.
const files = uploadBrochure.fields([
  { name: 'file', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

router.route('/').post(...adminOnly, files, createBrochure).get(getBrochures);

router
  .route('/:id')
  .put(...adminOnly, files, updateBrochure)
  .delete(...adminOnly, deleteBrochure);

export default router;
