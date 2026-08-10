"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAboutPage = exports.getAboutPage = void 0;
const AboutPage_1 = require("../models/AboutPage");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
/** Text fields the admin form may set, assigned verbatim when present. */
const TEXT_FIELDS = [
    'introEyebrow',
    'introTitle',
    'introBody',
    'introImage',
    'profileEyebrow',
    'profileTitle',
    'profileBody',
    'profileImage',
    'visionEyebrow',
    'visionTitle',
    'visionBody',
    'showroomEyebrow',
    'showroomTitle',
    'showroomBody',
    'showroomAddress',
    'showroomHours',
    'showroomMapUrl',
    'metaTitle',
    'metaDescription',
];
exports.getAboutPage = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    (0, responseHandler_1.successResponse)(res, 200, 'About page fetched', await (0, AboutPage_1.getOrCreateAboutPage)());
});
exports.updateAboutPage = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const about = await (0, AboutPage_1.getOrCreateAboutPage)();
    const body = req.body;
    for (const field of TEXT_FIELDS) {
        if (body[field] !== undefined)
            about[field] = body[field];
    }
    // FormData flattens arrays to strings, so the structured fields arrive
    // JSON-encoded — same revive step productController does.
    for (const field of ['visionPoints', 'showroomImages']) {
        if (typeof body[field] === 'string') {
            try {
                body[field] = JSON.parse(body[field]);
            }
            catch {
                delete body[field];
            }
        }
        if (Array.isArray(body[field]))
            about[field] = body[field];
    }
    // Newly uploaded files win over the URL already in the body. `upload.any()`
    // keeps the field list open so a new image slot needs no route change.
    const files = (Array.isArray(req.files) ? req.files : []);
    for (const file of files) {
        if (file.fieldname === 'introImageFile')
            about.introImage = file.path;
        else if (file.fieldname === 'profileImageFile')
            about.profileImage = file.path;
        else if (file.fieldname === 'showroomImageFiles') {
            about.showroomImages = [...(about.showroomImages || []), file.path];
        }
    }
    await about.save();
    (0, responseHandler_1.successResponse)(res, 200, 'About page updated', about);
});
//# sourceMappingURL=aboutController.js.map