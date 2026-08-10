"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFounderNote = exports.getFounderNote = void 0;
const FounderNote_1 = require("../models/FounderNote");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
exports.getFounderNote = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    (0, responseHandler_1.successResponse)(res, 200, 'Founder note fetched', await (0, FounderNote_1.getOrCreateFounderNote)());
});
exports.updateFounderNote = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const note = await (0, FounderNote_1.getOrCreateFounderNote)();
    const { eyebrow, heading, body1, body2, signature } = req.body;
    if (eyebrow !== undefined)
        note.eyebrow = eyebrow;
    if (heading !== undefined)
        note.heading = heading;
    if (body1 !== undefined)
        note.body1 = body1;
    if (body2 !== undefined)
        note.body2 = body2;
    if (signature !== undefined)
        note.signature = signature;
    // A freshly-uploaded file wins; else an image URL in the body keeps/sets it.
    if (req.file)
        note.image = req.file.path;
    else if (req.body.image)
        note.image = req.body.image;
    await note.save();
    (0, responseHandler_1.successResponse)(res, 200, 'Founder note updated', note);
});
//# sourceMappingURL=founderNoteController.js.map