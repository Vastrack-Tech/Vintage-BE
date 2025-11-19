import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';

// Example User Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
});

// Export relation types if needed
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
