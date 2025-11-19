import {
  pgTable,
  text,
  varchar,
  decimal,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateId } from './utils';
import { users } from './users.schema';
import { orders } from './orders.schema';

export const payments = pgTable('payments', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINPAY')),
  userId: varchar('user_id', { length: 20 })
    .references(() => users.id)
    .notNull(),
  orderId: varchar('order_id', { length: 20 }).references(() => orders.id), // Optional if funding wallet
  reference: text('reference').notNull().unique(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('NGN'),
  status: text('status').default('pending'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));