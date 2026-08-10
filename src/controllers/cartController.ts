import { Request, Response } from 'express';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';

// A cart line's "size" identifies the chosen variant. When the frontend doesn't send one
// (e.g. adding from a product card that has no size picker), fall back to the product's
// first/default variant volume so the same product always keys to the same line and merges.
const resolveSize = (product: any, size?: string): string | undefined => {
  if (size && size.length) return size;
  return product?.variants?.[0]?.volume;
};

// Get Cart
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  let cart = await Cart.findOne({ user: req.user?._id }).populate('items.product');
  if (!cart) {
    cart = await Cart.create({ user: req.user?._id, items: [] });
    return successResponse(res, 200, 'Cart fetched successfully', cart);
  }

  // Consolidate any lines that point to the same product + resolved size. This heals carts
  // that were split before size normalization existed (same item shown as two rows).
  const merged = new Map<string, { product: any; quantity: number; size?: string }>();
  let changed = false;

  for (const item of cart.items) {
    const product = item.product as any;
    if (!product) { changed = true; continue; } // drop lines whose product was deleted
    const size = resolveSize(product, item.size);
    const key = `${product._id.toString()}__${size ?? ''}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      changed = true;
    } else {
      merged.set(key, { product: product._id, quantity: item.quantity, size });
      if (size !== item.size) changed = true; // stored size differed from the resolved one
    }
  }

  if (changed) {
    cart.items = Array.from(merged.values()) as any;
    await cart.save();
    await cart.populate('items.product');
  }

  return successResponse(res, 200, 'Cart fetched successfully', cart);
});

// Add Item to Cart
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity, size } = req.body;
  
  const product = await Product.findById(productId);
  if (!product) {
    return errorResponse(res, 404, 'Product not found');
  }

  let cart = await Cart.findOne({ user: req.user?._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user?._id, items: [] });
  }

  const resolvedSize = resolveSize(product, size);

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId && item.size === resolvedSize
  );

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity, size: resolvedSize });
  }

  await cart.save();
  await cart.populate('items.product');

  return successResponse(res, 200, 'Item added to cart', cart);
});

// Update Cart Item Quantity
export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity, size } = req.body;

  let cart = await Cart.findOne({ user: req.user?._id });
  if (!cart) {
    return errorResponse(res, 404, 'Cart not found');
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId && item.size === size
  );

  if (existingItemIndex > -1) {
    if (quantity > 0) {
      cart.items[existingItemIndex].quantity = quantity;
    } else {
      cart.items.splice(existingItemIndex, 1);
    }
    await cart.save();
    await cart.populate('items.product');
    return successResponse(res, 200, 'Cart updated', cart);
  } else {
    return errorResponse(res, 404, 'Item not found in cart');
  }
});

// Remove Item from Cart
export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
  const { productId, size } = req.body; // or params, but using body is easier for optional size

  let cart = await Cart.findOne({ user: req.user?._id });
  if (!cart) {
    return errorResponse(res, 404, 'Cart not found');
  }

  cart.items = cart.items.filter(
    (item) => !(item.product.toString() === productId && item.size === size)
  );

  await cart.save();
  await cart.populate('items.product');

  return successResponse(res, 200, 'Item removed from cart', cart);
});

// Merge a guest cart into the authenticated user's cart.
// Adds incoming quantities to matching lines (same product + size) and pushes new ones.
export const mergeCart = asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body as {
    items?: { productId: string; quantity: number; size?: string }[];
  };

  let cart = await Cart.findOne({ user: req.user?._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user?._id, items: [] });
  }

  if (Array.isArray(items)) {
    for (const incoming of items) {
      const quantity = Number(incoming?.quantity);
      if (!incoming?.productId || !quantity || quantity < 1) continue;

      // Skip items whose product no longer exists.
      const product = await Product.findById(incoming.productId);
      if (!product) continue;

      const resolvedSize = resolveSize(product, incoming.size);

      const existingItemIndex = cart.items.findIndex(
        (item) => item.product.toString() === incoming.productId && item.size === resolvedSize
      );

      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        cart.items.push({ product: incoming.productId as any, quantity, size: resolvedSize });
      }
    }
    await cart.save();
  }

  await cart.populate('items.product');
  return successResponse(res, 200, 'Cart merged successfully', cart);
});

// Clear Cart
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  let cart = await Cart.findOne({ user: req.user?._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  return successResponse(res, 200, 'Cart cleared', cart);
});
