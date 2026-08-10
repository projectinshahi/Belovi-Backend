import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/stats', protect, authorize('admin', 'superadmin'), getDashboardStats);

export default router;
