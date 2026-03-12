import {
  pgTable,
  text,
  varchar,
  decimal,
  jsonb,
  timestamp,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateId } from './utils';
import { reviews } from './reviews.schema';

// --- CATEGORIES (Unchanged) ---
export const categories = pgTable('categories', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINCAT')),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

// --- PRODUCTS ---
export const products = pgTable('products', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINPROD')),

  categoryId: varchar('category_id', { length: 20 }).references(
    () => categories.id,
  ),

  title: text('title').notNull(),
  description: text('description').notNull(),
  priceNgn: decimal('price_ngn', { precision: 10, scale: 2 }).notNull(),
  priceUsd: decimal('price_usd', { precision: 10, scale: 2 }).notNull(),

  compareAtPriceNgn: decimal('compare_at_price_ngn', { precision: 10, scale: 2 }),
  compareAtPriceUsd: decimal('compare_at_price_usd', { precision: 10, scale: 2 }),

  gallery: jsonb('gallery').default([]),
  tags: jsonb('tags').$type<string[]>().default([]),

  // 👇 NEW: Define what options this product has (e.g. [{ name: "Length", values: ["12", "14"] }])
  options: jsonb('options').$type<{ name: string; values: string[] }[]>().default([]),

  isHot: boolean('is_hot').default(false),
  isActive: boolean('is_active').default(true),
  stockQuantity: integer('stock_quantity').default(0),
  averageRating: decimal('avg_rating', { precision: 3, scale: 2 }).default('0'),
  totalReviews: integer('total_reviews').default(0),
  features: text('features'),
  shippingPolicy: text('shipping_policy'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(variants),
  reviews: many(reviews),
}));

// --- VARIANTS ---
export const variants = pgTable('variants', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINVAR')),

  productId: varchar('product_id', { length: 20 })
    .references(() => products.id)
    .notNull(),

  name: text('name').notNull(), // e.g. "18 inch / Bone Straight"

  // Stores the combination: { "Length": "18", "Texture": "Bone Straight" }
  attributes: jsonb('attributes').notNull(),

  priceOverrideNgn: decimal('price_override_ngn', { precision: 10, scale: 2 }),
  priceOverrideUsd: decimal('price_override_usd', { precision: 10, scale: 2 }),

  stockQuantity: integer('stock_quantity').default(0),
  sku: text('sku').unique(),

  // 👇 NEW: Variant specific image
  image: text('image'),
});

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
}));

export const productColors = pgTable('product_colors', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINCOL')), // E.g., VINCOL-123456

  name: text('name').notNull().unique(), // e.g., "Colour 30" or "Burgundy"
  hexCode: text('hex_code').default('#000000'),
  imageUrl: text('image_url'),

  createdAt: timestamp('created_at').defaultNow(),
});