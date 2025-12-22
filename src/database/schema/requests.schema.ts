import { pgTable, text, varchar, timestamp, uuid } from 'drizzle-orm/pg-core';

export const contactRequests = pgTable('contact_requests', {
    id: uuid('id').defaultRandom().primaryKey(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    request: text('request_content').notNull(), // The message/subject
    status: text('status').default('new'), // new, contacted, resolved
    createdAt: timestamp('created_at').defaultNow(),
});