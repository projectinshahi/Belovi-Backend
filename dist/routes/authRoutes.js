"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validation_1 = require("../middlewares/validation");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
// Admin portal login (email + password). Gates on the admin roles — a customer
// signing in here is rejected, which is why customer sign-in is its own route.
router.post('/login', rateLimiter_1.authLimiter, (0, validation_1.validate)(validation_1.schemas.login), authController_1.loginAdmin);
// Customer authentication: Google, or email + password.
router.post('/google', authController_1.googleAuth);
router.post('/signin', rateLimiter_1.authLimiter, (0, validation_1.validate)(validation_1.schemas.login), authController_1.signInCustomer);
// Registration is a verified-email flow: `register` only mails a code, and the
// account is created by `register/verify` once that code comes back. Nothing is
// written to `users` in between.
//
// The two routes that send email carry `otpLimiter` (3 per IP per hour) so the
// endpoint can't be used to flood an inbox; `register/verify` carries
// `authLimiter` because guessing a code is a credential attack. Both limiters
// were already written for this and had never been wired up.
router.post('/register', rateLimiter_1.otpLimiter, (0, validation_1.validate)(validation_1.schemas.register), authController_1.startRegistration);
router.post('/register/verify', rateLimiter_1.authLimiter, (0, validation_1.validate)(validation_1.schemas.verifyOtp), authController_1.verifyRegistration);
router.post('/register/resend', rateLimiter_1.otpLimiter, (0, validation_1.validate)(validation_1.schemas.emailOnly), authController_1.resendRegistrationOtp);
// NOTE: Admin accounts are provisioned out-of-band via the standalone
// `createAdmin.ts` seed script — there is no public admin-creation endpoint.
exports.default = router;
//# sourceMappingURL=authRoutes.js.map