"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStorySettings = exports.reorderStorySections = exports.toggleStorySection = exports.deleteStorySection = exports.updateStorySection = exports.createStorySection = exports.getAdminStory = exports.getPublicStory = void 0;
const StorySection_1 = require("../models/StorySection");
const StorySettings_1 = require("../models/StorySettings");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
const SECTION_TYPES = ['hero', 'founders-note', 'text', 'image', 'gallery', 'quote', 'timeline', 'cta'];
/** Parse a value that may arrive as a JSON string (multipart) or already-parsed. */
function parseMaybeJSON(value, fallback) {
    if (value === undefined || value === null || value === '')
        return fallback;
    if (typeof value !== 'string')
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
/** Coerce multipart string booleans/numbers and collapse image fields. */
function normalizeBody(req) {
    const b = req.body;
    const files = req.files || {};
    // Single image: a freshly-uploaded file wins over any existing URL in the body.
    let image = typeof b.image === 'string' ? b.image : undefined;
    if (files['image'] && files['image'][0])
        image = files['image'][0].path;
    // Gallery: existing URLs come in as a JSON array in `images`, uploads under
    // `galleryImages`. Merge kept + new.
    const keptImages = parseMaybeJSON(b.images, []);
    const uploaded = (files['galleryImages'] || []).map((f) => f.path);
    const images = [...(Array.isArray(keptImages) ? keptImages : []), ...uploaded];
    const timeline = parseMaybeJSON(b.timeline, []);
    const out = {
        type: SECTION_TYPES.includes(b.type) ? b.type : 'text',
        eyebrow: b.eyebrow,
        title: b.title,
        body: b.body,
        tagline: b.tagline,
        imageAlt: b.imageAlt,
        quote: b.quote,
        quoteAuthor: b.quoteAuthor,
        ctaLabel: b.ctaLabel,
        ctaHref: b.ctaHref,
        imageLeft: b.imageLeft === 'true' || b.imageLeft === true,
        images,
        timeline: Array.isArray(timeline) ? timeline : [],
    };
    if (image !== undefined)
        out.image = image;
    if (b.order !== undefined && b.order !== '')
        out.order = Number(b.order) || 0;
    if (b.status === 'PUBLISHED' || b.status === 'DRAFT')
        out.status = b.status;
    return out;
}
// ── Public feed ───────────────────────────────────────────────────────────────
// GET /story  → published sections (ordered) + settings, for the storefront.
exports.getPublicStory = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const [sections, settings] = await Promise.all([
        StorySection_1.StorySection.find({ status: 'PUBLISHED' }).sort({ order: 1, createdAt: 1 }),
        (0, StorySettings_1.getOrCreateStorySettings)(),
    ]);
    (0, responseHandler_1.successResponse)(res, 200, 'Story fetched successfully', { sections, settings });
});
// ── Admin reads ───────────────────────────────────────────────────────────────
// GET /story/admin → every section (any status) + settings.
exports.getAdminStory = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const [sections, settings] = await Promise.all([
        StorySection_1.StorySection.find().sort({ order: 1, createdAt: 1 }),
        (0, StorySettings_1.getOrCreateStorySettings)(),
    ]);
    (0, responseHandler_1.successResponse)(res, 200, 'Story fetched successfully', { sections, settings });
});
// ── Section CRUD ──────────────────────────────────────────────────────────────
exports.createStorySection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = normalizeBody(req);
    if (!SECTION_TYPES.includes(data.type)) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'A valid section type is required');
    }
    // New sections land at the end of the list.
    if (data.order === undefined) {
        const last = await StorySection_1.StorySection.findOne().sort({ order: -1 });
        data.order = last ? last.order + 1 : 0;
    }
    const section = await StorySection_1.StorySection.create(data);
    (0, responseHandler_1.successResponse)(res, 201, 'Section created successfully', section);
});
exports.updateStorySection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await StorySection_1.StorySection.findById(req.params.id);
    if (!existing)
        return (0, responseHandler_1.errorResponse)(res, 404, 'Section not found');
    const data = normalizeBody(req);
    const section = await StorySection_1.StorySection.findByIdAndUpdate(req.params.id, data, {
        new: true,
        runValidators: true,
    });
    (0, responseHandler_1.successResponse)(res, 200, 'Section updated successfully', section);
});
exports.deleteStorySection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const section = await StorySection_1.StorySection.findByIdAndDelete(req.params.id);
    if (!section)
        return (0, responseHandler_1.errorResponse)(res, 404, 'Section not found');
    (0, responseHandler_1.successResponse)(res, 200, 'Section deleted successfully', null);
});
// PATCH /story/sections/:id/toggle → flip DRAFT ↔ PUBLISHED.
exports.toggleStorySection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const section = await StorySection_1.StorySection.findById(req.params.id);
    if (!section)
        return (0, responseHandler_1.errorResponse)(res, 404, 'Section not found');
    section.status = section.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    await section.save();
    (0, responseHandler_1.successResponse)(res, 200, `Section ${section.status === 'PUBLISHED' ? 'published' : 'unpublished'}`, section);
});
// PUT /story/sections/reorder → body { items: [{ id, order }] }.
exports.reorderStorySections = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const items = req.body.items;
    if (!Array.isArray(items)) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'items array is required');
    }
    await Promise.all(items
        .filter((it) => it && it.id)
        .map((it) => StorySection_1.StorySection.findByIdAndUpdate(it.id, { order: Number(it.order) || 0 })));
    const sections = await StorySection_1.StorySection.find().sort({ order: 1, createdAt: 1 });
    (0, responseHandler_1.successResponse)(res, 200, 'Sections reordered successfully', sections);
});
// ── Settings ──────────────────────────────────────────────────────────────────
exports.updateStorySettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const settings = await (0, StorySettings_1.getOrCreateStorySettings)();
    const { metaTitle, metaDescription, slug, introEyebrow, introHeading, introDescription } = req.body;
    if (metaTitle !== undefined)
        settings.metaTitle = metaTitle;
    if (metaDescription !== undefined)
        settings.metaDescription = metaDescription;
    if (slug !== undefined)
        settings.slug = String(slug).trim() || 'story';
    if (introEyebrow !== undefined)
        settings.introEyebrow = introEyebrow;
    if (introHeading !== undefined)
        settings.introHeading = introHeading;
    if (introDescription !== undefined)
        settings.introDescription = introDescription;
    await settings.save();
    (0, responseHandler_1.successResponse)(res, 200, 'Settings updated successfully', settings);
});
//# sourceMappingURL=storyController.js.map