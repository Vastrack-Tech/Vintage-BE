import { pgTable, text, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { roleEnum } from './enums';
import { orders } from './orders.schema';
import { reviews } from './reviews.schema';
import { referrals } from './referrals.schema';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password'),
  phone: text('phone'),
  address: text('address'),
  birthday: timestamp('birthday'),
  referralCode: text('referral_code').unique(),
  notifyEmail: boolean('notify_email').default(true),
  notifyPhone: boolean('notify_phone').default(true),
  role: roleEnum('role').default('customer').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  reviews: many(reviews),
  referrals: many(referrals, { relationName: 'referrer_referrals' }),
}));
