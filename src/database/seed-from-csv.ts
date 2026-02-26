import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { customAlphabet } from 'nanoid';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cache to prevent uploading the same image multiple times
const uploadedImagesCache = new Map<string, string>();

/**
 * Maps a WordPress URL to a local file in the 'uploads' folder, 
 * uploads to Cloudinary, and returns the new URL.
 */
async function processImages(rawImagesString: string): Promise<string[]> {
    if (!rawImagesString) return [];

    const originalUrls = rawImagesString.split(',').map(url => url.trim()).filter(Boolean);
    const newCloudUrls: string[] = [];

    for (const url of originalUrls) {
        // 1. Check cache first
        if (uploadedImagesCache.has(url)) {
            newCloudUrls.push(uploadedImagesCache.get(url)!);
            continue;
        }

        try {
            // 2. Parse URL and strip out the WordPress prefix
            // E.g. https://hairbyvintage.com/wp-content/uploads/2023/10/img.jpg
            const urlObj = new URL(url);

            // Remove '/wp-content/' leaving just 'uploads/2023/10/img.jpg'
            // If your path is slightly different, adjust the replace string here.
            let strippedPath = urlObj.pathname.replace('/wp-content/', '');

            // If there is a leading slash left over (e.g. '/uploads/...'), remove it so path.join works nicely
            if (strippedPath.startsWith('/')) {
                strippedPath = strippedPath.substring(1);
            }

            // 3. Join with current working directory
            const localPath = path.join(process.cwd(), strippedPath);

            // 4. Check if file exists and upload
            if (fs.existsSync(localPath)) {
                console.log(`☁️  Uploading to Cloudinary: ${strippedPath}...`);

                const result = await cloudinary.uploader.upload(localPath, {
                    upload_preset: "vintage",
                    resource_type: "auto",
                });

                const secureUrl = result.secure_url;
                uploadedImagesCache.set(url, secureUrl);
                newCloudUrls.push(secureUrl);
            } else {
                console.warn(`⚠️  Local file not found, keeping original URL: ${localPath}`);
                newCloudUrls.push(url);
            }
        } catch (error) {
            console.error(`❌ Failed to process image ${url}:`, error);
            newCloudUrls.push(url);
        }
    }

    return newCloudUrls;
}

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 6);
const generateId = (prefix: string) => `${prefix}-${nanoid()}`;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is missing');

const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

// Exchange Rate: 1 USD = 1500 NGN
const RATE = 1500;

async function seed() {
    console.log('🌱 Starting WooCommerce CSV Migration & Image Upload Pipeline...');

    // 1. CLEANUP OLD DATA
    console.log('⚠️  Cleaning old database tables...');
    await db.delete(schema.payments).execute().catch(() => { });
    await db.delete(schema.reviews).execute().catch(() => { });
    await db.delete(schema.orderItems).execute().catch(() => { });
    await db.delete(schema.orders).execute().catch(() => { });
    await db.delete(schema.variants).execute().catch(() => { });
    await db.delete(schema.products).execute().catch(() => { });
    await db.delete(schema.categories).execute().catch(() => { });
    console.log('✨ Data cleared!');

    // 2. READ CSV FILE
    const rows: any[] = [];
    await new Promise((resolve, reject) => {
        // 👇 Make sure this matches the name of your text-cleaned CSV
        fs.createReadStream('final_cleaned_products_text.csv')
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`📦 Parsed ${rows.length} rows from CSV.`);

    // 3. EXTRACT CATEGORIES
    const categoryMap = new Map<string, string>();
    for (const row of rows) {
        if (row['Categories']) {
            const cats = row['Categories'].split(',').map((c: string) => c.trim());
            for (const catName of cats) {
                if (!categoryMap.has(catName) && catName) {
                    const catId = generateId('VINCAT');
                    categoryMap.set(catName, catId);
                    await db.insert(schema.categories).values({
                        id: catId,
                        name: catName,
                        slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        description: `Imported category: ${catName}`,
                    });
                }
            }
        }
    }

    const fallbackCatId = generateId('VINCAT');
    await db.insert(schema.categories).values({
        id: fallbackCatId,
        name: 'Uncategorized',
        slug: 'uncategorized',
    });

    // PRE-CALCULATE VARIATION PRICES
    const variationRows = rows.filter((r) => r['Type'] === 'variation');
    const minPriceByParent = new Map<string, number>();

    for (const row of variationRows) {
        const parentCsvId = row['Parent']?.replace('id:', '').trim();
        const price = parseFloat(row['Regular price']);

        if (parentCsvId && !isNaN(price) && price > 0) {
            const currentMin = minPriceByParent.get(parentCsvId);
            if (currentMin === undefined || price < currentMin) {
                minPriceByParent.set(parentCsvId, price);
            }
        }
    }

    // 4. EXTRACT & INSERT PARENT PRODUCTS
    const productMap = new Map<string, { newId: string; options: any[] }>();
    const parentRows = rows.filter((r) => r['Type'] === 'simple' || r['Type'] === 'variable');

    console.log(`🛍️  Inserting ${parentRows.length} Parent Products...`);

    for (const row of parentRows) {
        const csvId = row['ID'];

        // Parse Options
        const options: { name: string; values: string[] }[] = [];
        for (let i = 1; i <= 3; i++) {
            const attrName = row[`Attribute ${i} name`];
            const attrVals = row[`Attribute ${i} value(s)`];
            if (attrName && attrVals) {
                options.push({
                    name: attrName.trim(),
                    values: attrVals.split(',').map((v: string) => v.trim()),
                });
            }
        }

        // Try to get the parent price. If it's 0, grab the lowest variation price!
        let priceUsd = parseFloat(row['Regular price']) || 0;
        if (priceUsd === 0) {
            priceUsd = minPriceByParent.get(csvId.toString()) || 0;
        }

        const priceNgn = priceUsd * RATE;
        const stockQuantity = parseInt(row['In stock?']) === 1 ? 50 : 0;

        // Process parent gallery images through Cloudinary pipeline
        const galleryImages = await processImages(row['Images']);

        let categoryId = fallbackCatId;
        if (row['Categories']) {
            const firstCat = row['Categories'].split(',')[0].trim();
            categoryId = categoryMap.get(firstCat) || fallbackCatId;
        }

        const newProductId = generateId('VINPROD');
        await db.insert(schema.products).values({
            id: newProductId,
            categoryId: categoryId,
            title: row['Name'] || 'Untitled Product',
            description: row['Description'] || '',
            priceNgn: priceNgn.toString(),
            priceUsd: priceUsd.toFixed(2),
            gallery: galleryImages, // Now contains pure Cloudinary URLs!
            options: options,
            isActive: parseInt(row['Published']) === 1,
            stockQuantity: stockQuantity,
        });

        productMap.set(csvId, { newId: newProductId, options });
    }

    // 5. EXTRACT & INSERT VARIATIONS
    console.log(`🧩 Inserting Variations from ${variationRows.length} CSV rows...`);

    for (const row of variationRows) {
        const parentCsvId = row['Parent']?.replace('id:', '').trim();
        const parentData = productMap.get(parentCsvId);

        if (!parentData) continue;

        const providedAttributes: Record<string, string> = {};
        for (let i = 1; i <= 3; i++) {
            const attrName = row[`Attribute ${i} name`];
            const attrVal = row[`Attribute ${i} value(s)`];
            if (attrName && attrVal) {
                providedAttributes[attrName.trim()] = attrVal.trim();
            }
        }

        // Handle WooCommerce "Any" logic via Cartesian generation
        let combinations = [providedAttributes];
        for (const opt of parentData.options) {
            if (!providedAttributes[opt.name]) {
                const newCombos: any[] = [];
                for (const combo of combinations) {
                    for (const val of opt.values) {
                        newCombos.push({ ...combo, [opt.name]: val });
                    }
                }
                combinations = newCombos;
            }
        }

        let priceUsd: number | null = null;
        let priceNgn: number | null = null;

        if (row['Regular price'] && row['Regular price'].trim() !== '') {
            const parsedUsd = parseFloat(row['Regular price']);
            if (!isNaN(parsedUsd)) {
                priceUsd = parsedUsd;
                priceNgn = priceUsd * RATE;
            }
        }

        const stockQuantity = parseInt(row['In stock?']) === 1 ? 10 : 0;

        // Process specific variant images through Cloudinary
        const variantImages = await processImages(row['Images']);
        const variantImage = variantImages.length > 0 ? variantImages[0] : null;

        for (const attributes of combinations) {
            const variantName = Object.entries(attributes)
                .map(([k, v]) => `${v}`)
                .join(' / ') || 'Standard';

            await db.insert(schema.variants).values({
                id: generateId('VINVAR'),
                productId: parentData.newId,
                name: variantName,
                attributes: attributes,
                priceOverrideNgn: priceNgn !== null ? priceNgn.toString() : null,
                priceOverrideUsd: priceUsd !== null ? priceUsd.toFixed(2) : null,
                stockQuantity: stockQuantity,
                sku: row['SKU'] || `SKU-${nanoid()}`,
                image: variantImage,
            });
        }
    }

    console.log('✅ Migration & Image Uploads complete! Your database is now seeded.');
    await pool.end();
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});