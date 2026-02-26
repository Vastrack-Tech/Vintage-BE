import {
  pgTable,
  varchar,
  decimal,
  integer,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orderStatusEnum } from './enums';
import { generateId } from './utils';
import { users } from './users.schema';
import { variants, products } from './products.schema';

// --- ORDERS (Unchanged) ---
export const orders = pgTable('orders', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINORD')),
  userId: text('user_id').references(() => users.id),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  shippingAddress: jsonb('shipping_address').notNull(),
  shippingAmountNgn: decimal('shipping_amount_ngn', { precision: 10, scale: 2 }).default('0'),
  shippingAmountUsd: decimal('shipping_amount_usd', { precision: 10, scale: 2 }).default('0'),
  totalAmountNgn: decimal('total_amount_ngn', { precision: 12, scale: 2 }).notNull(),
  totalAmountUsd: decimal('total_amount_usd', { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('pending'),
  currencyPaid: text('currency_paid').default('NGN'),
  paymentReference: text('payment_reference'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

// --- ORDER ITEMS ---
export const orderItems = pgTable('order_items', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINITM')),

  orderId: varchar('order_id', { length: 20 })
    .references(() => orders.id)
    .notNull(),

  productId: varchar('product_id', { length: 20 })
    .references(() => products.id)
    .notNull(),

  variantId: varchar('variant_id', { length: 20 })
    .references(() => variants.id),

  // 👇 NEW: Persist the specific variant name at time of purchase
  variantName: text('variant_name'),

  quantity: integer('quantity').default(1),
  priceAtPurchaseNgn: decimal('price_at_purchase_ngn', { precision: 10, scale: 2 }).notNull(),
  priceAtPurchaseUsd: decimal('price_at_purchase_usd', { precision: 10, scale: 2 }).notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(variants, {
    fields: [orderItems.variantId],
    references: [variants.id],
  }),
}));