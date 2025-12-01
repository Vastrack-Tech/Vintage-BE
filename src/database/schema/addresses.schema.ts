import { pgTable, text, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateId } from './utils';
import { users } from './users.schema';

export const addresses = pgTable('addresses', {
  id: varchar('id', { length: 20 }).primaryKey().$defaultFn(() => generateId('VINADDR')),
  userId: varchar('user_id', { length: 20 }).references(() => users.id).notNull(),
  
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone').notNull(),
  addressLine: text('address_line').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code'),
  
  isDefault: boolean('is_default').default(false),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));