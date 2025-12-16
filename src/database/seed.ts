import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { customAlphabet } from 'nanoid';

// Load environment variables
dotenv.config();

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 6);
const generateId = (prefix: string) => `${prefix}-${nanoid()}`;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is missing');

// Ensure SSL for production connection
const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

// Mock Exchange Rate: 1 USD = 1500 NGN
const RATE = 1500;

async function seed() {
  console.log('🌱 Seeding database...');

  // 0. CLEANUP (Delete in this specific order to avoid Foreign Key errors)
  console.log('⚠️  Cleaning old data...');
  
  // 1. Delete items that depend on others first
  await db.delete(schema.reviews);      // Depends on Products/Users
  await db.delete(schema.orderItems);   // Depends on Orders/Variants
  await db.delete(schema.orders);       // Depends on Users
  await db.delete(schema.variants);     // Depends on Products
  
  // 2. Delete parent items
  await db.delete(schema.products);     // Depends on Categories
  await db.delete(schema.categories);   
  
  // Optional: Delete users if you are re-seeding them too
  // await db.delete(schema.users); 

  console.log('✨ Data cleared!');

  // 1. Create Categories
  console.log('Creating Categories...');
  const categoriesData = [
    { name: 'Wigs', slug: 'wigs', description: 'Premium human hair wigs' },
    { name: 'Extensions', slug: 'extensions', description: 'Luxury hair extensions' },
    { name: 'Care Products', slug: 'care', description: 'Shampoos and conditioners' },
  ];

  const categoryMap = new Map();

  for (const cat of categoriesData) {
    const [newCat] = await db
      .insert(schema.categories)
      .values({
        id: generateId('VINCAT'),
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      })
      .onConflictDoNothing()
      .returning();

    if (newCat) categoryMap.set(cat.slug, newCat.id);
  }

  // If categories existed before, fetch them to populate map
  if (categoryMap.size === 0) {
    const existing = await db.query.categories.findMany();
    existing.forEach(c => categoryMap.set(c.slug, c.id));
  }

  // 2. Define Product Data
  const productSamples = [
    // --- WIGS ---
    {
      title: 'Brazilian Kinky Human Hair Twist',
      desc: 'Salt & Pepper style, perfect for a natural look.',
      priceNgn: 1324151,
      compareNgn: 1524151,
      tags: ['Brazilian', 'Kinky', 'Short', 'Wigs'],
      cat: 'wigs',
      isHot: true,
      rating: '4.8',
    },
    {
      title: 'Bone Straight Vietnamese Wig',
      desc: 'Ultra smooth, tangle free luxury hair.',
      priceNgn: 850000,
      compareNgn: null,
      tags: ['Vietnamese', 'Straight', 'Long', 'Wigs'],
      cat: 'wigs',
      isHot: true,
      rating: '5.0',
    },
    {
      title: 'Short Pixie Curl Wig',
      desc: 'Fun and flirty short curls.',
      priceNgn: 45000,
      compareNgn: 50000,
      tags: ['Curly', 'Short', 'Wigs'],
      cat: 'wigs',
      isHot: false,
      rating: '4.2',
    },
    {
      title: 'Afro Kinky Bulk Hair',
      desc: 'For creating natural looking locs.',
      priceNgn: 25000,
      compareNgn: null,
      tags: ['Kinky', 'Bulk', 'Wigs'],
      cat: 'wigs',
      isHot: false,
      rating: '4.0',
    },
    {
      title: 'Blonde 613 Bob Wig',
      desc: 'Striking blonde bob cut.',
      priceNgn: 120000,
      compareNgn: 150000,
      tags: ['Blonde', 'Short', 'Straight', 'Wigs'],
      cat: 'wigs',
      isHot: true,
      rating: '4.9',
    },
  ];

  // Generate Randoms
  const hairTypes = ['Brazilian', 'Peruvian', 'Vietnamese', 'Synthetic'];
  const styles = ['Curly', 'Straight', 'Wavy', 'Kinky'];
  const lengths = ['Short', 'Medium', 'Long'];

  for (let i = 0; i < 15; i++) {
    const type = hairTypes[Math.floor(Math.random() * hairTypes.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const length = lengths[Math.floor(Math.random() * lengths.length)];

    const price = Math.floor(Math.random() * 500000) + 20000;
    const hasDiscount = Math.random() > 0.5;

    productSamples.push({
      title: `${type} ${style} ${length} Hair`,
      desc: `High quality ${type} hair in ${style} style.`,
      priceNgn: price,
      compareNgn: hasDiscount ? Math.floor(price * 1.2) : null,
      tags: [type, style, length, 'Generated'],
      cat: i % 2 === 0 ? 'extensions' : 'care',
      isHot: Math.random() > 0.8,
      rating: (Math.random() * 2 + 3).toFixed(1),
    });
  }

  console.log(`Inserting ${productSamples.length} products...`);

  // 3. Insert Products AND Variants
  for (const p of productSamples) {
    const catId = categoryMap.get(p.cat) || categoryMap.get('wigs'); // Fallback

    const priceUsd = (p.priceNgn / RATE).toFixed(2);
    const compareAtNgnStr = p.compareNgn ? p.compareNgn.toString() : null;
    const compareAtUsdStr = p.compareNgn ? (p.compareNgn / RATE).toFixed(2) : null;

    // Default stock for seed
    const INITIAL_STOCK = 100;

    // A. Create Product
    const [newProduct] = await db.insert(schema.products).values({
      id: generateId('VINPROD'),
      categoryId: catId,
      title: p.title,
      description: p.desc,
      priceNgn: p.priceNgn.toString(),
      priceUsd: priceUsd,
      compareAtPriceNgn: compareAtNgnStr,
      compareAtPriceUsd: compareAtUsdStr,
      tags: p.tags,
      isHot: p.isHot,
      averageRating: p.rating.toString(),
      totalReviews: Math.floor(Math.random() * 50),
      isActive: true,
      stockQuantity: INITIAL_STOCK, // 👈 KEY FIX: Set stock on the product itself
      gallery: [
        'https://placehold.co/600x400/png?text=Hair+Front',
        'https://placehold.co/600x400/png?text=Hair+Side',
      ]
    }).returning();

    // B. Create Default Variant
    await db.insert(schema.variants).values({
      id: generateId('VINVAR'),
      productId: newProduct.id,
      name: 'Standard',
      attributes: { color: 'Natural', length: 'Standard' },
      stockQuantity: INITIAL_STOCK, // Matches product stock
      sku: `SKU-${newProduct.id.split('-')[1]}`,
      priceOverrideNgn: null,
      priceOverrideUsd: null
    });
  }

  console.log('✅ Seeding complete!');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});