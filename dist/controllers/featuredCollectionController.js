"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFeaturedCollection = exports.getFeaturedCollection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const FeaturedCollection_1 = require("../models/FeaturedCollection");
const Product_1 = require("../models/Product");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
/** Mirrors NEW_IMAGE_TOKEN in the admin (products/_components/types.ts). */
const NEW_IMAGE_TOKEN = '__new__';
/**
 * Only what a card actually draws. The rail needs the piece's photograph, its
 * name and its category (for the link); sending whole product documents — with
 * every variant, spec and related id — would be several times the payload for a
 * homepage band.
 */
const CARD_PRODUCT_FIELDS = 'name category images variants';
const withProducts = (collection) => collection.populate({ path: 'cards.products', select: CARD_PRODUCT_FIELDS });
/**
 * Writes an `_id` onto any card stored without one, once.
 *
 * Cards were briefly stored with `_id: false`, so their documents carry no id at
 * all. Mongoose mints one for an id-less subdocument at HYDRATION — which means
 * a different id on every single read. A card's listing lives at
 * `/collections/<id>`, so the homepage would render a link with one id and the
 * listing page would resolve a different one a moment later, and every click
 * would 404.
 *
 * Repairing on read rather than in a migration script: this is the only thing
 * that reads these documents, the check is one lean query, and it makes the
 * fix arrive without anyone having to remember to run anything. It is
 * idempotent and, after the first call, does nothing.
 */
async function persistMissingCardIds() {
    const raw = await FeaturedCollection_1.FeaturedCollection.findOne().select('cards').lean();
    if (!raw?.cards?.length)
        return;
    if (raw.cards.every((c) => c?._id))
        return;
    await FeaturedCollection_1.FeaturedCollection.updateOne({ _id: raw._id }, {
        $set: {
            cards: raw.cards.map((c) => ({ ...c, _id: c?._id ?? new mongoose_1.default.Types.ObjectId() })),
        },
    });
}
exports.getFeaturedCollection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await persistMissingCardIds();
    const collection = await (0, FeaturedCollection_1.getOrCreateFeaturedCollection)();
    await withProducts(collection);
    (0, responseHandler_1.successResponse)(res, 200, 'Featured Collection fetched successfully', collection);
});
exports.updateFeaturedCollection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const collection = await (0, FeaturedCollection_1.getOrCreateFeaturedCollection)();
    // FormData flattens everything to strings, so the card list arrives
    // JSON-encoded and has to be revived before Mongoose sees it.
    if (typeof req.body.cards === 'string') {
        try {
            req.body.cards = JSON.parse(req.body.cards);
        }
        catch {
            return (0, responseHandler_1.errorResponse)(res, 400, 'The card list was not valid JSON.');
        }
    }
    if (req.body.cards !== undefined) {
        if (!Array.isArray(req.body.cards)) {
            return (0, responseHandler_1.errorResponse)(res, 400, 'The card list must be an array.');
        }
        /* Uploads arrive as `cardImages`, in the same order as the tokens standing
           in for them inside the card list — the scheme the product form uses, so a
           card's photograph survives being reordered in the same save.
    
           Deliberately not `mergeImageOrder`: that helper drops falsy entries, and a
           card is allowed to have no image of its own (it falls back to the
           product's). Dropping one here would slide every later card's photograph
           onto the wrong card. Positions are held exactly. */
        const files = (Array.isArray(req.files) ? req.files : []);
        const uploaded = files.filter((f) => f.fieldname === 'cardImages').map((f) => f.path);
        let next = 0;
        req.body.cards = req.body.cards.map((c) => ({
            /* Carried through, not regenerated. Each card has a listing page at
               `/collections/<id>`; minting a fresh id on every save would break every
               link the studio had ever shared. A card with no id is a new one, and
               Mongoose mints it. */
            ...(mongoose_1.default.isValidObjectId(c?._id) ? { _id: c._id } : {}),
            /* Deduped, order preserved: the same piece twice in one group would draw
               the same card twice in that listing. */
            products: [
                ...new Set((Array.isArray(c?.products) ? c.products : [])
                    .map((id) => String(id || '').trim())
                    .filter(Boolean)),
            ],
            image: c?.image === NEW_IMAGE_TOKEN ? uploaded[next++] || '' : String(c?.image || '').trim(),
            badge: String(c?.badge || '').trim(),
            title: String(c?.title || '').trim(),
            subtitle: String(c?.subtitle || '').trim(),
        }));
        /* A card is a group of pieces, so it has to hold at least one that exists —
           an empty group renders as a card that shows nothing when selected.
           Checked here rather than in the schema because the message needs to say
           which card is wrong, and because the admin's picker is only an
           affordance: a direct PUT would bypass it. */
        const cards = req.body.cards;
        const emptyAt = cards.findIndex((c) => c.products.length === 0);
        if (emptyAt !== -1) {
            return (0, responseHandler_1.errorResponse)(res, 400, `Card ${emptyAt + 1} needs at least one product.`);
        }
        const allIds = cards.flatMap((c) => c.products);
        const malformed = allIds.find((id) => !mongoose_1.default.isValidObjectId(id));
        if (malformed) {
            const at = cards.findIndex((c) => c.products.includes(malformed));
            return (0, responseHandler_1.errorResponse)(res, 400, `Card ${at + 1} has an invalid product id.`);
        }
        const found = await Product_1.Product.find({ _id: { $in: allIds } }).select('_id').lean();
        const known = new Set(found.map((p) => String(p._id)));
        const missing = allIds.find((id) => !known.has(id));
        if (missing) {
            const at = cards.findIndex((c) => c.products.includes(missing));
            return (0, responseHandler_1.errorResponse)(res, 400, `Card ${at + 1} includes a piece that no longer exists. Remove it and save again.`);
        }
    }
    Object.assign(collection, req.body);
    await collection.save();
    await withProducts(collection);
    (0, responseHandler_1.successResponse)(res, 200, 'Featured Collection updated successfully', collection);
});
//# sourceMappingURL=featuredCollectionController.js.map