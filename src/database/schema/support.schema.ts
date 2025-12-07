import { pgTable, text, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateId } from './utils';
import { users } from './users.schema';

// --- CONTACT MESSAGES ---
export const contactMessages = pgTable('contact_messages', {
    id: varchar('id', { length: 20 }).primaryKey().$defaultFn(() => generateId('VINMSG')),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    message: text('message').notNull(),
    status: text('status').default('unread'), // unread, read, replied
    createdAt: timestamp('created_at').defaultNow(),
});

// --- REFERRALS ---
export const referrals = pgTable('referrals', {
    id: varchar('id', { length: 20 }).primaryKey().$defaultFn(() => generateId('VINREF')),
    referrerId: varchar('referrer_id', { length: 36 }).references(() => users.id).notNull(),
    refereeId: varchar('referee_id', { length: 36 }).references(() => users.id), // Null until they signup
    code: text('code').notNull().unique(), // Unique referral code
    status: text('status').default('pending'), // pending, completed
    rewardAmount: integer('reward_amount').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

export const referralsRelations = relations(referrals, ({ one }) => ({
    referrer: one(users, {
        fields: [referrals.referrerId],
        references: [users.id],
        relationName: 'referrer_referrals'
    }),
    referee: one(users, {
        fields: [referrals.refereeId],
        references: [users.id],
        relationName: 'referee_referral'
    }),
}));