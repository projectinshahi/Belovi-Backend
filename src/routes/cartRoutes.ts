import { Router } from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart, mergeCart } from '../controllers/cartController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// All cart routes require authentication
router.use(protect);

router.route('/')
  .get(getCart)
  .post(addToCart)
  .delete(clearCart); // Delete whole cart or clear items

// Merge a guest cart into the user's cart after login
router.post('/merge', mergeCart);

router.route('/item')
  .put(updateCartItem)
  .delete(removeFromCart); // Requires body { productId, size }

export default router;
