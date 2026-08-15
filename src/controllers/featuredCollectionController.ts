import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { FeaturedCollection, getOrCreateFeaturedCollection } from '../models/FeaturedCollection';
import { Product } from '../models/Product';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';

/** Mirrors NEW_IMAGE_TOKEN in the admin (products/_components/types.ts). */
const NEW_IMAGE_TOKEN = '__new__';

/**
 * Only what a card actually draws. The rail needs the piece's photograph, its
 * name and its category (for the link); sending whole product documents — with
 * every variant, spec and related id — would be several times the payload for a
 * homepage band.
 */
const CARD_PRODUCT_FIELDS = 'name category images variants';

const withProducts = (collection: Awaited<ReturnType<typeof getOrCreateFeaturedCollection>>) =>
  collection.populate({ path: 'cards.products', select: CARD_PRODUCT_FIELDS });

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
async function persistMissingCardIds(): Promise<void> {
  const raw = await FeaturedCollection.findOne().select('cards').lean();
  if (!raw?.cards?.length) return;
  if (raw.cards.every((c) => c?._id)) return;

  await FeaturedCollection.updateOne(
    { _id: raw._id },
    {
      $set: {
        cards: raw.cards.map((c) => ({ ...c, _id: c?._id ?? new mongoose.Types.ObjectId() })),
      },
    }
  );
}

export const getFeaturedCollection = asyncHandler(async (req: Request, res: Response) => {
  await persistMissingCardIds();
  const collection = await getOrCreateFeaturedCollection();
  await withProducts(collection);
  successResponse(res, 200, 'Featured Collection fetched successfully', collection);
});

export const updateFeaturedCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await getOrCreateFeaturedCollection();

  // FormData flattens everything to strings, so the card list arrives
  // JSON-encoded and has to be revived before Mongoose sees it.
  if (typeof req.body.cards === 'string') {
    try {
      req.body.cards = JSON.parse(req.body.cards);
    } catch {
      return errorResponse(res, 400, 'The card list was not valid JSON.');
    }
  }

  if (req.body.cards !== undefined) {
    if (!Array.isArray(req.body.cards)) {
      return errorResponse(res, 400, 'The card list must be an array.');
    }

    /* Uploads arrive as `cardImages`, in the same order as the tokens standing
       in for them inside the card list — the scheme the product form uses, so a
       card's photograph survives being reordered in the same save.

       Deliberately not `mergeImageOrder`: that helper drops falsy entries, and a
       card is allowed to have no image of its own (it falls back to the
       product's). Dropping one here would slide every later card's photograph
       onto the wrong card. Positions are held exactly. */
    const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
    const uploaded = files.filter((f) => f.fieldname === 'cardImages').map((f) => f.path);
    let next = 0;

    req.body.cards = req.body.cards.map((c: Record<string, unknown>) => ({
      /* Carried through, not regenerated. Each card has a listing page at
         `/collections/<id>`; minting a fresh id on every save would break every
         link the studio had ever shared. A card with no id is a new one, and
         Mongoose mints it. */
      ...(mongoose.isValidObjectId(c?._id) ? { _id: c._id } : {}),
      /* Deduped, order preserved: the same piece twice in one group would draw
         the same card twice in that listing. */
      products: [
        ...new Set(
          (Array.isArray(c?.products) ? c.products : [])
            .map((id: unknown) => String(id || '').trim())
            .filter(Boolean)
        ),
      ],
      image:
        c?.image === NEW_IMAGE_TOKEN ? uploaded[next++] || '' : String(c?.image || '').trim(),
      badge: String(c?.badge || '').trim(),
      title: String(c?.title || '').trim(),
      subtitle: String(c?.subtitle || '').trim(),
    }));

    /* A card is a group of pieces, so it has to hold at least one that exists —
       an empty group renders as a card that shows nothing when selected.
       Checked here rather than in the schema because the message needs to say
       which card is wrong, and because the admin's picker is only an
       affordance: a direct PUT would bypass it. */
    const cards: { products: string[] }[] = req.body.cards;

    const emptyAt = cards.findIndex((c) => c.products.length === 0);
    if (emptyAt !== -1) {
      return errorResponse(res, 400, `Card ${emptyAt + 1} needs at least one product.`);
    }

    const allIds = cards.flatMap((c) => c.products);

    const malformed = allIds.find((id) => !mongoose.isValidObjectId(id));
    if (malformed) {
      const at = cards.findIndex((c) => c.products.includes(malformed));
      return errorResponse(res, 400, `Card ${at + 1} has an invalid product id.`);
    }

    const found = await Product.find({ _id: { $in: allIds } }).select('_id').lean();
    const known = new Set(found.map((p) => String(p._id)));
    const missing = allIds.find((id) => !known.has(id));
    if (missing) {
      const at = cards.findIndex((c) => c.products.includes(missing));
      return errorResponse(
        res,
        400,
        `Card ${at + 1} includes a piece that no longer exists. Remove it and save again.`
      );
    }
  }

  Object.assign(collection, req.body);
  await collection.save();
  await withProducts(collection);

  successResponse(res, 200, 'Featured Collection updated successfully', collection);
});
