import express from 'express';
import { createCategory, getCategories, deleteCategory, updateCategory } from '../controllers/categoryController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

// Catalog writes are admin-only; reads stay public.
const adminOnly = [protect, authorize('admin', 'superadmin')];

router.route('/')
  .post(...adminOnly, upload.single('imageFile'), createCategory)
  .get(getCategories);

router.route('/:id')
  .put(...adminOnly, upload.single('imageFile'), updateCategory)
  .delete(...adminOnly, deleteCategory);

export default router;
