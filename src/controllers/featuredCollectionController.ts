import { Request, Response } from 'express';
import { getOrCreateFeaturedCollection } from '../models/FeaturedCollection';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/responseHandler';

export const getFeaturedCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await getOrCreateFeaturedCollection();
  // Populate the products to return their full data
  await collection.populate('products');
  successResponse(res, 200, 'Featured Collection fetched successfully', collection);
});

export const updateFeaturedCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await getOrCreateFeaturedCollection();

  // If there are newly uploaded image files, append them to req.body.images
  if (req.files) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files['imageFiles'] && files['imageFiles'].length > 0) {
      const uploadedPaths = files['imageFiles'].map(f => f.path);
      
      // req.body.images can be a string or array of strings if existing images are kept
      let existingImages: string[] = [];
      if (req.body.images) {
        if (Array.isArray(req.body.images)) {
          existingImages = req.body.images;
        } else {
          existingImages = [req.body.images];
        }
      }
      req.body.images = [...existingImages, ...uploadedPaths];
    }
  }

  // Mongoose $set will replace arrays, so req.body.products should be an array of ObjectIds
  if (req.body.products && typeof req.body.products === 'string') {
    try {
      req.body.products = JSON.parse(req.body.products);
    } catch (e) {
      // do nothing, let it be
    }
  }

  Object.assign(collection, req.body);
  await collection.save();
  await collection.populate('products');

  successResponse(res, 200, 'Featured Collection updated successfully', collection);
});
