"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEditSections = exports.getEditSections = void 0;
const EditSectionSettings_1 = require("../models/EditSectionSettings");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
// Only the four descriptions are editable — names/order/existence are fixed in code.
const KEYS = ['within', 'beyond', 'furniture', 'archive'];
exports.getEditSections = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    (0, responseHandler_1.successResponse)(res, 200, 'Edit sections fetched', await (0, EditSectionSettings_1.getOrCreateEditSections)());
});
exports.updateEditSections = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const doc = await (0, EditSectionSettings_1.getOrCreateEditSections)();
    for (const k of KEYS) {
        if (typeof req.body[k] === 'string')
            doc[k] = req.body[k].trim();
    }
    await doc.save();
    (0, responseHandler_1.successResponse)(res, 200, 'Edit sections updated', doc);
});
//# sourceMappingURL=editSectionController.js.map