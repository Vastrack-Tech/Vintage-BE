import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['customer', 'admin']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
]);
