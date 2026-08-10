import express from 'express';
import { subscribe, getSubscribers, deleteSubscriber } from '../controllers/newsletterController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { validate, schemas } from '../middlewares/validation';

const router = express.Router();

// Public — subscribe to "Notes from the Studio"
router.post('/subscribe', validate(schemas.subscribe), subscribe);

// Admin — manage subscribers
router.get('/admin', protect, authorize('admin', 'superadmin'), getSubscribers);
router.delete('/admin/:id', protect, authorize('admin', 'superadmin'), deleteSubscriber);

export default router;
