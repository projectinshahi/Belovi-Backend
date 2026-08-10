import express from 'express';
import { createProduct, getProducts, getProductById, deleteProduct, updateProduct } from '../controllers/productController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

// Catalog writes are admin-only; reads stay public.
const adminOnly = [protect, authorize('admin', 'superadmin')];

// upload.any() accepts the product's `imageFiles` plus per-variant `variantImages_<index>` fields
router.route('/')
  .post(...adminOnly, upload.any(), createProduct)
  .get(getProducts);

router.route('/:id')
  .get(getProductById)
  .put(...adminOnly, upload.any(), updateProduct)
  .delete(...adminOnly, deleteProduct);

export default router;
