import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { customAlphabet } from 'nanoid';

dotenv.config();
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
const generateId = (prefix: string) => `${prefix}-${nanoid()}`;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

// Mock Rate
const RATE = 1500;

async function seedOrders() {
  console.log('🌱 Seeding Orders...');

  const user = await db.query.users.findFirst();
  if (!user) throw new Error('Please create a user first via the app!');

  const variant = await db.query.variants.findFirst();
  if (!variant) throw new Error('Please seed products first!');

  for (let i = 0; i < 4; i++) {
    const priceNgn = 1324151;
    const priceUsd = (priceNgn / RATE).toFixed(2);

    // Create Order
    const [order] = await db
      .insert(schema.orders)
      .values({
        id: generateId('VINORD'),
        userId: user.id,
        // FIX: Use new currency fields
        totalAmountNgn: priceNgn.toString(),
        totalAmountUsd: priceUsd,
        currencyPaid: 'NGN',
        status: i < 2 ? 'pending' : 'delivered',
        createdAt: new Date(),
      })
      .returning();

    // Add Item to Order
    await db.insert(schema.orderItems).values({
      id: generateId('VINITM'),
      orderId: order.id,
      variantId: variant.id,
      quantity: 1,
      // FIX: Use new currency fields
      priceAtPurchaseNgn: priceNgn.toString(),
      priceAtPurchaseUsd: priceUsd,
    });
  }

  console.log('✅ Orders Seeded!');
  await pool.end();
}

seedOrders().catch(console.error);