import express from 'express';
import { getSiteSettings, updateSiteSettings } from '../controllers/siteSettingsController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();
router.get('/', getSiteSettings);
router.put('/', protect, authorize('admin', 'superadmin'), updateSiteSettings);
export default router;
