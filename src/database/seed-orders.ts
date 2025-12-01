import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { customAlphabet } from 'nanoid';

dotenv.config();
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
const generateId = (prefix: string) => `${prefix}-${nanoid()}`;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seedOrders() {
  console.log('🌱 Seeding Orders...');

  // 1. Find a user (or create one if none exist)
  const user = await db.query.users.findFirst();
  if (!user) throw new Error('Please create a user first via the app!');

  // 2. Find a variant (product)
  const variant = await db.query.variants.findFirst();
  if (!variant) throw new Error('Please seed products first!');

  // 3. Create Orders (Mix of Active and Completed)
  const statuses = ['pending', 'paid', 'shipped', 'delivered'];

  for (let i = 0; i < 4; i++) {
    // Create Order
    const [order] = await db
      .insert(schema.orders)
      .values({
        id: generateId('VINORD'),
        userId: user.id,
        totalAmount: (1324151).toString(),
        status: i < 2 ? 'pending' : 'delivered', // 2 active, 2 completed
        createdAt: new Date(),
      })
      .returning();

    // Add Item to Order
    await db.insert(schema.orderItems).values({
      id: generateId('VINITM'),
      orderId: order.id,
      variantId: variant.id,
      quantity: 1,
      priceAtPurchase: (1324151).toString(),
    });
  }

  console.log('✅ Orders Seeded!');
  await pool.end();
}

seedOrders().catch(console.error);
