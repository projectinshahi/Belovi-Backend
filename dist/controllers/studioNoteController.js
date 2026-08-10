"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudioNote = exports.getStudioNote = void 0;
const StudioNote_1 = require("../models/StudioNote");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
exports.getStudioNote = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    (0, responseHandler_1.successResponse)(res, 200, 'Studio note fetched', await (0, StudioNote_1.getOrCreateStudioNote)());
});
exports.updateStudioNote = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const note = await (0, StudioNote_1.getOrCreateStudioNote)();
    const { eyebrow, heading, description, ctaLabel, ctaHref } = req.body;
    if (eyebrow !== undefined)
        note.eyebrow = eyebrow;
    if (heading !== undefined)
        note.heading = heading;
    if (description !== undefined)
        note.description = description;
    if (ctaLabel !== undefined)
        note.ctaLabel = ctaLabel;
    if (ctaHref !== undefined)
        note.ctaHref = ctaHref;
    await note.save();
    (0, responseHandler_1.successResponse)(res, 200, 'Studio note updated', note);
});
//# sourceMappingURL=studioNoteController.js.map