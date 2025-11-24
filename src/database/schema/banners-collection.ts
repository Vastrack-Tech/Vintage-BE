import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { generateId } from './utils';

export const banners = pgTable('banners', {
  id: varchar('id', { length: 20 })
    .primaryKey()
    .$defaultFn(() => generateId('VINBAN')),
  name: text('name').notNull(),
  page: text('page').notNull(),
  section: text('section').notNull(),
  url: text('url').notNull(),
  clickUrl: text('click_url'),
  position: integer('position').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});