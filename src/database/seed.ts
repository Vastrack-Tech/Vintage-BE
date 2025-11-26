import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { customAlphabet } from 'nanoid';

dotenv.config();

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 6);
const generateId = (prefix: string) => `${prefix}-${nanoid()}`;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is missing');

const pool = new Pool({ connectionString: dbUrl });
const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create Categories
  console.log('Creating Categories...');
  const categoriesData = [
    { name: 'Wigs', slug: 'wigs', description: 'Premium human hair wigs' },
    {
      name: 'Extensions',
      slug: 'extensions',
      description: 'Luxury hair extensions',
    },
    {
      name: 'Care Products',
      slug: 'care',
      description: 'Shampoos and conditioners',
    },
  ];

  const categoryMap = new Map(); // To store ID for product linking

  for (const cat of categoriesData) {
    const [newCat] = await db
      .insert(schema.categories)
      .values({
        id: generateId('VINCAT'),
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      })
      .onConflictDoNothing() // Skip if exists (optional)
      .returning();

    if (newCat) categoryMap.set(cat.slug, newCat.id);
  }

  // 2. Create Products (25 Items mirroring filters)
  console.log('Creating Products...');

  const productSamples = [
    // --- WIGS ---
    {
      title: 'Brazilian Kinky Human Hair Twist',
      desc: 'Salt & Pepper style, perfect for a natural look.',
      price: '1324151',
      compare: '1524151', // Has discount
      tags: ['Brazilian', 'Kinky', 'Short', 'Wigs'],
      cat: 'wigs',
      isHot: true,
      rating: '4.8',
    },
    {
      title: 'Bone Straight Vietnamese Wig',
      desc: 'Ultra smooth, tangle free luxury hair.',
      price: '850000',
      compare: null,
      tags: ['Vietnamese', 'Straight', 'Long', 'Wigs'],
      cat: 'wigs',
      isHot: true,
      rating: '5.0',
    },
    {
      title: 'Short Pixie Curl Wig',
      desc: 'Fun and flirty short curls.',
      price: '45000',
      compare: '50000',
      tags: ['Curly', 'Short', 'Wigs'],
      cat: 'wigs',
      isHot: false,
      rating: '4.2',
    },
    {
      title: 'Afro Kinky Bulk Hair',
      desc: 'For creating natural looking locs.',
      price: '25000',
      compare: null,
      tags: ['Kinky', 'Bulk', 'Wigs'],
      cat: 'wigs',
      isHot: false,
      rating: '4.0',
    },
    {
      title: 'Blonde 613 Bob Wig',
      desc: 'Striking blonde bob cut.',
      price: '120000',
      compare: '150000',
      tags: ['Blonde', 'Short', 'Straight', 'Wigs'],
      cat: 'wigs',
      isHot: true,
      rating: '4.9',
    },

    // ... Generating 20 more varied items programmatically below
  ];

  // Helper to generate random variations for bulk data
  const hairTypes = ['Brazilian', 'Peruvian', 'Vietnamese', 'Synthetic'];
  const styles = ['Curly', 'Straight', 'Wavy', 'Kinky'];
  const lengths = ['Short', 'Medium', 'Long'];

  for (let i = 0; i < 20; i++) {
    const type = hairTypes[Math.floor(Math.random() * hairTypes.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const length = lengths[Math.floor(Math.random() * lengths.length)];
    const price = Math.random() * 500000 + 20000;
    const hasDiscount = Math.random() > 0.5;

    productSamples.push({
      title: `${type} ${style} ${length} Hair`,
      desc: `High quality ${type} hair in ${style} style.`,
      price: price.toFixed(2),
      compare: hasDiscount ? (price * 1.2).toFixed(2) : null,
      tags: [type, style, length, 'Generated'],
      cat: i % 2 === 0 ? 'extensions' : 'care', // Split between remaining cats
      isHot: Math.random() > 0.8,
      rating: (Math.random() * 2 + 3).toFixed(1), // Random rating 3.0 - 5.0
    });
  }

  // Insert all products
  for (const p of productSamples) {
    const catId = categoryMap.get(p.cat) || categoryMap.get('wigs');

    await db.insert(schema.products).values({
      id: generateId('VINPROD'),
      categoryId: catId,
      title: p.title,
      description: p.desc,
      basePrice: p.price,
      compareAtPrice: p.compare,
      tags: p.tags,
      isHot: p.isHot,
      averageRating: p.rating,
      totalReviews: Math.floor(Math.random() * 50),
      isActive: true,
      gallery: [
        'https://placehold.co/600x400/png?text=Hair+Image', // Placeholder image
        'https://placehold.co/600x400/png?text=Side+View',
      ],
    });
  }

  console.log('✅ Seeding complete!');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});