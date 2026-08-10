import { Router } from 'express';
import {
  loginAdmin,
  googleAuth,
  startRegistration,
  verifyRegistration,
  resendRegistrationOtp,
  signInCustomer,
} from '../controllers/authController';
import { validate, schemas } from '../middlewares/validation';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Admin portal login (email + password). Gates on the admin roles — a customer
// signing in here is rejected, which is why customer sign-in is its own route.
router.post('/login', authLimiter, validate(schemas.login), loginAdmin);

// Customer authentication: Google, or email + password.
router.post('/google', googleAuth);
router.post('/signin', authLimiter, validate(schemas.login), signInCustomer);

// Registration is a verified-email flow: `register` only mails a code, and the
// account is created by `register/verify` once that code comes back. Nothing is
// written to `users` in between.
//
// The two routes that send email carry `otpLimiter` (3 per IP per hour) so the
// endpoint can't be used to flood an inbox; `register/verify` carries
// `authLimiter` because guessing a code is a credential attack. Both limiters
// were already written for this and had never been wired up.
router.post('/register', otpLimiter, validate(schemas.register), startRegistration);
router.post('/register/verify', authLimiter, validate(schemas.verifyOtp), verifyRegistration);
router.post('/register/resend', otpLimiter, validate(schemas.emailOnly), resendRegistrationOtp);

// NOTE: Admin accounts are provisioned out-of-band via the standalone
// `createAdmin.ts` seed script — there is no public admin-creation endpoint.

export default router;
