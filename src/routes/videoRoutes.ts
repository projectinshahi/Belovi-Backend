import express from 'express';
import { createVideo, getVideos, updateVideo, deleteVideo } from '../controllers/videoController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Writes are admin-only; reads stay public.
const adminOnly = [protect, authorize('admin', 'superadmin')];

router.route('/').get(getVideos).post(...adminOnly, createVideo);
router.route('/:id').put(...adminOnly, updateVideo).delete(...adminOnly, deleteVideo);

export default router;
