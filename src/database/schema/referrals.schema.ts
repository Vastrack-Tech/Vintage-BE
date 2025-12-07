import { pgTable, text, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { generateId } from './utils';
import { users } from './users.schema';

export const referrals = pgTable('referrals', {
    id: varchar('id', { length: 20 })
        .primaryKey()
        .$defaultFn(() => generateId('VINREF')),

    // The person who OWNS the code
    referrerId: varchar('referrer_id', { length: 36 })
        .references(() => users.id)
        .notNull(),

    // The new user who USED the code (Nullable: because the initial code generation row has no referee yet)
    refereeId: varchar('referee_id', { length: 36 })
        .references(() => users.id),

    code: text('code').notNull(), // e.g. "VIN-ABC12"

    status: text('status').default('active'), // 'active', 'completed', 'pending'
    rewardAmount: integer('reward_amount').default(0),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const referralsRelations = relations(referrals, ({ one }) => ({
    referrer: one(users, {
        fields: [referrals.referrerId],
        references: [users.id],
        relationName: 'referrer_referrals',
    }),
    referee: one(users, {
        fields: [referrals.refereeId],
        references: [users.id],
        relationName: 'referee_referral',
    }),
}));