import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateId } from './utils';
import { users } from './users.schema';
import { products } from './products.schema';

export const reviews = pgTable('reviews', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINREV')),
  userId: varchar('user_id', { length: 20 }).references(() => users.id),
  productId: varchar('product_id', { length: 20 }).references(
    () => products.id,
  ),
  rating: integer('rating').notNull(),
  content: text('content'),
  customerPhotoUrl: text('customer_photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));
