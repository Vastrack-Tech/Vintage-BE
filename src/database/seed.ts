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

// Helpers for Variants
const COLORS = ['Natural', 'Jet Black', 'Burgundy', 'Blonde 613'];
const LENGTHS = ['10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30'];

function getRandomSubset(arr: string[], min = 1, max = 3) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * (max - min + 1)) + min);
}

async function seed() {
  console.log('🌱 Seeding database...');

  // 0. CLEANUP (Delete in this specific order to avoid Foreign Key errors)
  console.log('⚠️  Cleaning old data...');

  await db.delete(schema.payments);       // Depends on Orders
  await db.delete(schema.reviews);        // Depends on Products/Users
  await db.delete(schema.orderItems);     // Depends on Orders/Variants
  await db.delete(schema.orders);         // Depends on Users
  await db.delete(schema.variants);       // Depends on Products
  await db.delete(schema.products);       // Depends on Categories
  await db.delete(schema.categories);
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

  // 2. Define Product Data
  const productSamples = [
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
    // ... Add more manual items if needed
  ];

  // Generate Random Products to fill the list
  const hairTypes = ['Brazilian', 'Peruvian', 'Vietnamese', 'Synthetic'];
  const styles = ['Curly', 'Straight', 'Wavy', 'Kinky'];

  for (let i = 0; i < 15; i++) {
    const type = hairTypes[Math.floor(Math.random() * hairTypes.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const price = Math.floor(Math.random() * 500000) + 20000;

    productSamples.push({
      title: `${type} ${style} Hair`,
      desc: `High quality ${type} hair in ${style} style.`,
      priceNgn: price,
      compareNgn: Math.random() > 0.7 ? Math.floor(price * 1.2) : null,
      tags: [type, style, 'Generated'],
      cat: i % 2 === 0 ? 'extensions' : 'care',
      isHot: Math.random() > 0.8,
      rating: (Math.random() * 2 + 3).toFixed(1),
    });
  }

  console.log(`Inserting ${productSamples.length} products...`);

  // 3. Insert Products with VARIANTS & OPTIONS
  for (const p of productSamples) {
    const catId = categoryMap.get(p.cat) || categoryMap.get('wigs');

    // Generate random Options for this product
    // E.g. [ { name: "Color", values: ["Natural", "Black"] }, { name: "Length", values: ["14", "16"] } ]
    const hasColor = Math.random() > 0.2;
    const hasLength = Math.random() > 0.1;

    const options: { name: string; values: string[] }[] = [];

    if (hasColor) options.push({ name: 'Color', values: getRandomSubset(COLORS, 1, 2) });
    if (hasLength) options.push({ name: 'Length', values: getRandomSubset(LENGTHS, 2, 4) });
    // Generate Variant Combinations
    let variantsToInsert: any[] = [];

    if (options.length === 0) {
      // No options -> 1 Default Variant
      variantsToInsert.push({
        name: 'Standard',
        attributes: {},
        stock: 50,
        priceNgn: null, // No override
        priceUsd: null
      });
    } else {
      // Generate Cartesian Product
      // Simulating the matrix generation logic
      const generateCombos = (opts: any[], idx = 0, current: any = {}): any[] => {
        if (idx === opts.length) return [current];
        let res: any[] = [];
        for (const val of opts[idx].values) {
          res = res.concat(generateCombos(opts, idx + 1, { ...current, [opts[idx].name]: val }));
        }
        return res;
      };

      const combinations = generateCombos(options);

      variantsToInsert = combinations.map(combo => {
        const name = Object.values(combo).join(' / ');

        // Logic: Longer hair costs more
        let priceMod = 0;
        if (combo.Length) {
          priceMod = (parseInt(combo.Length) - 10) * 5000; // +5k per 2 inches over 10
        }

        return {
          name: name,
          attributes: combo,
          stock: Math.floor(Math.random() * 20), // Random stock 0-20
          priceNgn: priceMod > 0 ? (p.priceNgn + priceMod).toString() : null,
          priceUsd: priceMod > 0 ? ((p.priceNgn + priceMod) / RATE).toFixed(2) : null
        };
      });
    }

    // Calculate Total Stock for the Product Table
    const totalStock = variantsToInsert.reduce((sum, v) => sum + v.stock, 0);

    // Insert Product
    const [newProduct] = await db.insert(schema.products).values({
      id: generateId('VINPROD'),
      categoryId: catId,
      title: p.title,
      description: p.desc,
      priceNgn: p.priceNgn.toString(),
      priceUsd: (p.priceNgn / RATE).toFixed(2),
      compareAtPriceNgn: p.compareNgn ? p.compareNgn.toString() : null,
      compareAtPriceUsd: p.compareNgn ? (p.compareNgn / RATE).toFixed(2) : null,
      tags: p.tags,
      isHot: p.isHot,
      options: options, // 👈 Saving the options structure
      averageRating: p.rating.toString(),
      totalReviews: Math.floor(Math.random() * 50),
      isActive: true,
      stockQuantity: totalStock, // 👈 Sum of variants
      gallery: [
        'https://placehold.co/600x600/png?text=Front+View',
        'https://placehold.co/600x600/png?text=Side+View',
        'https://placehold.co/600x600/png?text=Back+View'
      ]
    }).returning();

    // Insert Variants
    if (variantsToInsert.length > 0) {
      await db.insert(schema.variants).values(
        variantsToInsert.map(v => ({
          id: generateId('VINVAR'),
          productId: newProduct.id,
          name: v.name,
          attributes: v.attributes,
          stockQuantity: v.stock,
          sku: `SKU-${nanoid()}`,
          priceOverrideNgn: v.priceNgn,
          priceOverrideUsd: v.priceUsd,
          image: null // Can add specific variant images here if needed
        }))
      );
    }
  }

  console.log('✅ Seeding complete!');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});