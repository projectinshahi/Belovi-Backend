import mongoose, { Document, Schema } from 'mongoose';

/**
 * A storefront category, as the studio creates it in Category Management.
 *
 * THIS COLLECTION IS THE WHOLE CATEGORY SYSTEM. There is no fixed list beside
 * it, here or in either front end: the storefront's Shop menu, homepage Category
 * Section, search chips, /the-edit tiles and shop filter are all built from
 * these documents, and a product may only be filed under one of them. Create a
 * category and it appears everywhere; delete it and it leaves.
 *
 * It used to sit beside a hardcoded list of five names that the storefront
 * rendered directly. That was the bug behind "categories added in the admin
 * don't show up" — two sources with no reason to agree. There is one now.
 */
export interface ICategory extends Document {
  name: string;
  image: string;
  status: string;
}

const categorySchema = new Schema<ICategory>(
  {
    /**
     * `unique` is what actually stops two rows of the same name racing in past
     * the controller's check; the controller's is for the message, this is for
     * the guarantee. Two documents with one name would render a duplicate pill
     * and split one filter between them.
     */
    name: { type: String, required: true, trim: true, unique: true },
    image: { type: String, required: true },
    status: { type: String, default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Category = mongoose.model<ICategory>('Category', categorySchema);
