import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { errorResponse } from '../utils/responseHandler';

// Validation middleware factory
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return errorResponse(res, 400, 'Validation failed', errors);
      }
      return errorResponse(res, 400, 'Invalid request data');
    }
  };
};

/**
 * Registration fields. `trim()` here only affects what is validated — the
 * middleware doesn't write the parsed value back — so the controller trims and
 * lowercases again before use.
 */
const registrationEmail = z
  .string()
  .trim()
  .max(254, 'Email address is too long')
  .email('Invalid email address');

// Common validation schemas
export const schemas = {
  // Auth schemas
  register: z.object({
    body: z
      .object({
        name: z
          .string()
          .trim()
          .min(2, 'Name must be at least 2 characters')
          .max(100, 'Name must be 100 characters or fewer')
          // Control characters only; letters of any script, spaces, hyphens and
          // apostrophes are all legitimate in names.
          .regex(/^[^\p{Cc}]*$/u, 'Name contains characters that are not allowed'),
        email: registrationEmail,
        password: z.string()
          .min(8, 'Password must be at least 8 characters')
          // bcrypt reads only the first 72 bytes; anything past that would be
          // silently ignored, so longer passwords are refused instead.
          .max(64, 'Password must be 64 characters or fewer')
          .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
          .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
          .regex(/[0-9]/, 'Password must contain at least one number')
          .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
          .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password is too long'),
        phone: z.string().optional(),
      })
      // Rejects role, isVerified and anything else a client might try to set.
      .strict(),
  }),

  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  verifyOtp: z.object({
    body: z
      .object({
        email: registrationEmail,
        otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
      })
      .strict(),
  }),

  /** Resending a verification code needs only the address it was sent to. */
  emailOnly: z.object({
    body: z
      .object({
        email: registrationEmail,
      })
      .strict(),
  }),

  // Product schemas
  createProduct: z.object({
    body: z.object({
      name: z.string().min(1, 'Product name is required').max(200),
      description: z
        .string()
        .min(10, 'Description must be at least 10 characters')
        .max(200, 'Description cannot exceed 200 characters'),
      price: z.number().positive('Price must be positive').or(z.string().transform(Number)),
      category: z.string().min(1, 'Category is required'),
      stock: z.number().int().nonnegative('Stock cannot be negative').or(z.string().transform(Number)),
      images: z.array(z.string().url()).optional(),
    }),
  }),

  updateProduct: z.object({
    params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
    }),
    body: z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().min(10).max(200).optional(),
      price: z.number().positive().or(z.string().transform(Number)).optional(),
      category: z.string().optional(),
      stock: z.number().int().nonnegative().or(z.string().transform(Number)).optional(),
      images: z.array(z.string().url()).optional(),
    }),
  }),

  // Order schemas
  createOrder: z.object({
    body: z.object({
      total: z.number().positive('Total must be positive').max(1000000, 'Total amount too large'),
    }),
  }),

  verifyPayment: z.object({
    body: z.object({
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
      items: z.array(z.object({
        product: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })).min(1, 'At least one item is required'),
      shippingAddress: z.object({
        street: z.string().optional(),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        zipCode: z.string().optional(),
        country: z.string().optional(),
      }),
      subtotal: z.number().positive(),
      discount: z.number().nonnegative(),
      total: z.number().positive(),
    }),
  }),

  // User schemas
  updateProfile: z.object({
    body: z.object({
      name: z.string().min(2).max(100).optional(),
      phone: z.string().max(20).optional(),
    }),
  }),

  addAddress: z.object({
    body: z.object({
      street: z.string().max(200).optional(),
      apartment: z.string().max(100).optional(),
      landmark: z.string().max(100).optional(),
      city: z.string().min(1, 'City is required').max(100),
      state: z.string().min(1, 'State is required').max(100),
      zipCode: z.string().max(20).optional(),
      country: z.string().max(100).optional(),
    }),
  }),

  // Newsletter
  subscribe: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      source: z.string().max(60).optional(),
    }),
  }),

  // ID parameter validation
  mongoId: z.object({
    params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
    }),
  }),
};
