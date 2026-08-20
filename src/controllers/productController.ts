import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';

/** Mirrors NEW_IMAGE_TOKEN in the admin (products/_components/types.ts). */
const NEW_IMAGE_TOKEN = '__new__';

/**
 * Stitch the admin's ordered `images` array back together with the files it
 * uploaded alongside it. Each NEW_IMAGE_TOKEN takes the next uploaded URL, so
 * a shot picked in this same save can still be `images[0]` — the primary.
 *
 * Uploads with no token left to claim them are appended, which is exactly what
 * a client that sends no tokens at all (the previous behaviour) gets.
 */
export const mergeImageOrder = (images: string[], uploaded: string[]): string[] => {
  let next = 0;
  const ordered = images
    .map(url => (url === NEW_IMAGE_TOKEN ? uploaded[next++] : url))
    .filter(Boolean);
  return [...ordered, ...uploaded.slice(next)];
};

// Attach uploaded files to the product (imageFiles) and to each variant (variantImages_<index>)
const attachUploads = (req: Request) => {
  const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];

  // FormData flattens everything to strings, so the structured fields arrive
  // JSON-encoded and have to be revived before Mongoose sees them. `variants`
  // has always needed this; `specs`, `careIcons`, `sizeChart` and `materials`
  // are the PDP / merchandising fields.
  for (const field of ['variants', 'specifications', 'careIcons', 'features', 'materials', 'relatedProducts'] as const) {
    if (typeof req.body[field] === 'string') {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch {
        // Leave it as-is and let schema validation produce the error.
      }
    }
  }

  /* Product-level images: the admin's ordered list, with uploads slotted in.
   *
   * ONLY when the request actually carries them. This used to run
   * unconditionally, so a save that sent no `images` field wrote an empty array
   * over whatever the piece already had — silently deleting its photographs.
   * A client that does not manage this field must be able to save without
   * destroying it. */
  const productFileUrls = files.filter(f => f.fieldname === 'imageFiles').map(f => f.path);
  const carriesImages = req.body.images !== undefined || productFileUrls.length > 0;
  if (carriesImages) {
    if (typeof req.body.images === 'string') {
      req.body.images = [req.body.images];
    }
    req.body.images = mergeImageOrder(req.body.images || [], productFileUrls);
  }

  // Per-variant images: merge existing URLs (already in the parsed variant) with uploaded files
  if (Array.isArray(req.body.variants)) {
    req.body.variants = req.body.variants.map((variant: any, index: number) => {
      const variantFileUrls = files
        .filter(f => f.fieldname === `variantImages_${index}`)
        .map(f => f.path);
      const existing = Array.isArray(variant.images) ? variant.images : [];
      return { ...variant, images: [...existing, ...variantFileUrls] };
    });
  }
};

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  attachUploads(req);

  const product = await Product.create(req.body);
  successResponse(res, 201, 'Product created successfully', product);
});

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const products = await Product.find().sort({ createdAt: -1 }).populate('relatedProducts');
  successResponse(res, 200, 'Products fetched successfully', products);
});

/**
 * One product by id. Public, like `getProducts` — the storefront's size guide
 * needs a single piece's chart and should not have to pull the whole catalogue
 * to find it.
 */
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  // An id that isn't a valid ObjectId makes findById throw a CastError, which
  // would surface as a 500. A bad id in a URL is a 404, not a server fault.
  const product = await Product.findById(req.params.id).populate('relatedProducts').catch(() => null);
  if (!product) {
    return errorResponse(res, 404, 'Product not found');
  }
  successResponse(res, 200, 'Product fetched successfully', product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  let product = await Product.findById(req.params.id);
  if (!product) {
    return errorResponse(res, 404, 'Product not found');
  }

  attachUploads(req);

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  
  successResponse(res, 200, 'Product updated successfully', product);
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return errorResponse(res, 404, 'Product not found');
  }
  successResponse(res, 200, 'Product deleted successfully', null);
});
