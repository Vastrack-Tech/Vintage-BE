import {
  pgTable,
  varchar,
  decimal,
  integer,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orderStatusEnum } from './enums';
import { generateId } from './utils';
import { users } from './users.schema';
import { variants } from './products.schema';

// --- ORDERS ---
export const orders = pgTable('orders', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINORD')),
  userId: varchar('user_id', { length: 20 })
    .references(() => users.id)
    .notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('pending'),
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
  variantId: varchar('variant_id', { length: 20 })
    .references(() => variants.id)
    .notNull(),
  quantity: integer('quantity').default(1),
  priceAtPurchase: decimal('price_at_purchase', {
    precision: 10,
    scale: 2,
  }).notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(variants, {
    fields: [orderItems.variantId],
    references: [variants.id],
  }),
}));