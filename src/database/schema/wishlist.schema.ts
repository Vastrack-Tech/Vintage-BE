import { pgTable, text, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateId } from './utils';
import { users } from './users.schema';
import { products } from './products.schema';

export const wishlists = pgTable('wishlists', {
    id: varchar('id', { length: 20 }).primaryKey().$defaultFn(() => generateId('VINWISH')),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
    productId: varchar('product_id', { length: 20 }).references(() => products.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
    // Prevents a user from adding the same product twice
    unq: unique().on(t.userId, t.productId),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
    user: one(users, {
        fields: [wishlists.userId],
        references: [users.id],
    }),
    product: one(products, {
        fields: [wishlists.productId],
        references: [products.id],
    }),
}));