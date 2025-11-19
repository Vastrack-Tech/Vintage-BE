import {
  pgTable,
  text,
  varchar,
  decimal,
  jsonb,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateId } from './utils';
import { reviews } from './reviews.schema';

// --- CATEGORIES ---
export const categories = pgTable('categories', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINCAT')),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').unique(),
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
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  gallery: jsonb('gallery').default([]),
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
  name: text('name').notNull(),
  attributes: jsonb('attributes').notNull(),
  priceOverride: decimal('price_override', { precision: 10, scale: 2 }),
  stockQuantity: integer('stock_quantity').default(0),
  sku: text('sku').unique(),
});

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
}));