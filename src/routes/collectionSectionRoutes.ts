import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import {
  getCollectionSection,
  updateCollectionSection,
} from '../controllers/collectionSectionController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { MAX_IMAGE_MB, uploadImages } from '../middlewares/uploadMiddleware';
import { LIMITS } from '../models/CollectionSection';
import { errorResponse } from '../utils/responseHandler';

const router = express.Router();

const receive = uploadImages.fields([
  { name: 'mainImageFile', maxCount: 1 },
  { name: 'imageFiles', maxCount: LIMITS.maxImages },
]);

/** Multer's own limits surface as 400s the admin can show, not as 500s. */
const files = (req: Request, res: Response, next: NextFunction) =>
  receive(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      return errorResponse(
        res,
        400,
        err.code === 'LIMIT_FILE_SIZE' ? `Each image must be under ${MAX_IMAGE_MB} MB.` : err.message
      );
    }
    next(err);
  });

router.get('/', getCollectionSection);
router.put('/', protect, authorize('admin', 'superadmin'), files, updateCollectionSection);

export default router;
