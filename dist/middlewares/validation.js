"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.validate = void 0;
const zod_1 = require("zod");
const responseHandler_1 = require("../utils/responseHandler");
// Validation middleware factory
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                return (0, responseHandler_1.errorResponse)(res, 400, 'Validation failed', errors);
            }
            return (0, responseHandler_1.errorResponse)(res, 400, 'Invalid request data');
        }
    };
};
exports.validate = validate;
/**
 * Registration fields. `trim()` here only affects what is validated — the
 * middleware doesn't write the parsed value back — so the controller trims and
 * lowercases again before use.
 */
const registrationEmail = zod_1.z
    .string()
    .trim()
    .max(254, 'Email address is too long')
    .email('Invalid email address');
// Common validation schemas
exports.schemas = {
    // Auth schemas
    register: zod_1.z.object({
        body: zod_1.z
            .object({
            name: zod_1.z
                .string()
                .trim()
                .min(2, 'Name must be at least 2 characters')
                .max(100, 'Name must be 100 characters or fewer')
                // Control characters only; letters of any script, spaces, hyphens and
                // apostrophes are all legitimate in names.
                .regex(/^[^\p{Cc}]*$/u, 'Name contains characters that are not allowed'),
            email: registrationEmail,
            password: zod_1.z.string()
                .min(8, 'Password must be at least 8 characters')
                // bcrypt reads only the first 72 bytes; anything past that would be
                // silently ignored, so longer passwords are refused instead.
                .max(64, 'Password must be 64 characters or fewer')
                .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
                .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
                .regex(/[0-9]/, 'Password must contain at least one number')
                .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
                .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password is too long'),
            phone: zod_1.z.string().optional(),
        })
            // Rejects role, isVerified and anything else a client might try to set.
            .strict(),
    }),
    login: zod_1.z.object({
        body: zod_1.z.object({
            email: zod_1.z.string().email('Invalid email address'),
            password: zod_1.z.string().min(1, 'Password is required'),
        }),
    }),
    verifyOtp: zod_1.z.object({
        body: zod_1.z
            .object({
            email: registrationEmail,
            otp: zod_1.z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
        })
            .strict(),
    }),
    /** Resending a verification code needs only the address it was sent to. */
    emailOnly: zod_1.z.object({
        body: zod_1.z
            .object({
            email: registrationEmail,
        })
            .strict(),
    }),
    // Product schemas
    createProduct: zod_1.z.object({
        body: zod_1.z.object({
            name: zod_1.z.string().min(1, 'Product name is required').max(200),
            description: zod_1.z
                .string()
                .min(10, 'Description must be at least 10 characters')
                .max(200, 'Description cannot exceed 200 characters'),
            price: zod_1.z.number().positive('Price must be positive').or(zod_1.z.string().transform(Number)),
            category: zod_1.z.string().min(1, 'Category is required'),
            stock: zod_1.z.number().int().nonnegative('Stock cannot be negative').or(zod_1.z.string().transform(Number)),
            images: zod_1.z.array(zod_1.z.string().url()).optional(),
        }),
    }),
    updateProduct: zod_1.z.object({
        params: zod_1.z.object({
            id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
        }),
        body: zod_1.z.object({
            name: zod_1.z.string().min(1).max(200).optional(),
            description: zod_1.z.string().min(10).max(200).optional(),
            price: zod_1.z.number().positive().or(zod_1.z.string().transform(Number)).optional(),
            category: zod_1.z.string().optional(),
            stock: zod_1.z.number().int().nonnegative().or(zod_1.z.string().transform(Number)).optional(),
            images: zod_1.z.array(zod_1.z.string().url()).optional(),
        }),
    }),
    // Order schemas
    createOrder: zod_1.z.object({
        body: zod_1.z.object({
            total: zod_1.z.number().positive('Total must be positive').max(1000000, 'Total amount too large'),
        }),
    }),
    verifyPayment: zod_1.z.object({
        body: zod_1.z.object({
            razorpay_order_id: zod_1.z.string().min(1),
            razorpay_payment_id: zod_1.z.string().min(1),
            razorpay_signature: zod_1.z.string().min(1),
            items: zod_1.z.array(zod_1.z.object({
                product: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
                quantity: zod_1.z.number().int().positive(),
                price: zod_1.z.number().positive(),
            })).min(1, 'At least one item is required'),
            shippingAddress: zod_1.z.object({
                street: zod_1.z.string().optional(),
                city: zod_1.z.string().min(1, 'City is required'),
                state: zod_1.z.string().min(1, 'State is required'),
                zipCode: zod_1.z.string().optional(),
                country: zod_1.z.string().optional(),
            }),
            subtotal: zod_1.z.number().positive(),
            discount: zod_1.z.number().nonnegative(),
            total: zod_1.z.number().positive(),
        }),
    }),
    // User schemas
    updateProfile: zod_1.z.object({
        body: zod_1.z.object({
            name: zod_1.z.string().min(2).max(100).optional(),
            phone: zod_1.z.string().max(20).optional(),
        }),
    }),
    addAddress: zod_1.z.object({
        body: zod_1.z.object({
            street: zod_1.z.string().max(200).optional(),
            apartment: zod_1.z.string().max(100).optional(),
            landmark: zod_1.z.string().max(100).optional(),
            city: zod_1.z.string().min(1, 'City is required').max(100),
            state: zod_1.z.string().min(1, 'State is required').max(100),
            zipCode: zod_1.z.string().max(20).optional(),
            country: zod_1.z.string().max(100).optional(),
        }),
    }),
    // Newsletter
    subscribe: zod_1.z.object({
        body: zod_1.z.object({
            email: zod_1.z.string().email('Invalid email address'),
            source: zod_1.z.string().max(60).optional(),
        }),
    }),
    // ID parameter validation
    mongoId: zod_1.z.object({
        params: zod_1.z.object({
            id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
        }),
    }),
};
//# sourceMappingURL=validation.js.map