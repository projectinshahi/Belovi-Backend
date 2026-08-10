"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFaqStatus = exports.deleteFaq = exports.updateFaq = exports.createFaq = exports.getAdminFaqs = exports.getPublicFaqs = void 0;
const Faq_1 = require("../models/Faq");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
exports.getPublicFaqs = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const faqs = await Faq_1.Faq.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    (0, responseHandler_1.successResponse)(res, 200, 'FAQs fetched successfully', faqs);
});
exports.getAdminFaqs = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const faqs = await Faq_1.Faq.find().sort({ order: 1, createdAt: -1 });
    (0, responseHandler_1.successResponse)(res, 200, 'FAQs fetched successfully', faqs);
});
exports.createFaq = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { question, answer, order, isActive } = req.body;
    if (!question || !answer) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Please provide question and answer');
    }
    const faq = await Faq_1.Faq.create({ question, answer, order, isActive });
    (0, responseHandler_1.successResponse)(res, 201, 'FAQ created successfully', faq);
});
exports.updateFaq = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { question, answer, order, isActive } = req.body;
    const faq = await Faq_1.Faq.findByIdAndUpdate(id, { question, answer, order, isActive }, { new: true, runValidators: true });
    if (!faq)
        return (0, responseHandler_1.errorResponse)(res, 404, 'FAQ not found');
    (0, responseHandler_1.successResponse)(res, 200, 'FAQ updated successfully', faq);
});
exports.deleteFaq = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const faq = await Faq_1.Faq.findByIdAndDelete(id);
    if (!faq)
        return (0, responseHandler_1.errorResponse)(res, 404, 'FAQ not found');
    (0, responseHandler_1.successResponse)(res, 200, 'FAQ deleted successfully', null);
});
exports.toggleFaqStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const faq = await Faq_1.Faq.findById(id);
    if (!faq)
        return (0, responseHandler_1.errorResponse)(res, 404, 'FAQ not found');
    faq.isActive = !faq.isActive;
    await faq.save();
    (0, responseHandler_1.successResponse)(res, 200, `FAQ ${faq.isActive ? 'activated' : 'deactivated'} successfully`, faq);
});
//# sourceMappingURL=faqController.js.map