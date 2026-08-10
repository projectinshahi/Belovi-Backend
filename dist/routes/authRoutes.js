"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validation_1 = require("../middlewares/validation");
const router = (0, express_1.Router)();
// Admin portal login (email + password)
router.post('/login', (0, validation_1.validate)(validation_1.schemas.login), authController_1.loginAdmin);
// Customer authentication is Google-only
router.post('/google', authController_1.googleAuth);
// NOTE: Admin accounts are provisioned out-of-band via the standalone
// `createAdmin.ts` seed script — there is no public admin-creation endpoint.
exports.default = router;
//# sourceMappingURL=authRoutes.js.map