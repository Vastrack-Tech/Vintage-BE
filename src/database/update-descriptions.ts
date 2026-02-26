import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import fs from 'fs';
import csv from 'csv-parser';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is missing');

const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

async function updateDescriptions() {
    console.log('🔄 Starting Description Update...');

    // 1. Read the CLEANED CSV to get the exact titles currently in the DB
    const cleanedRows: any[] = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream('final_cleaned_products_text.csv')
            .pipe(csv())
            .on('data', (data) => cleanedRows.push(data))
            .on('end', resolve)
            .on('error', reject);
    });

    // 2. Read the RAW CSV to get the original unformatted descriptions
    const rawRows: any[] = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream('final_cleaned_products_no_zeros.csv')
            .pipe(csv())
            .on('data', (data) => rawRows.push(data))
            .on('end', resolve)
            .on('error', reject);
    });

    // 3. Map raw descriptions by their original WordPress ID
    const rawDescMap = new Map<string, string>();
    for (const row of rawRows) {
        rawDescMap.set(row['ID'], row['Description'] || '');
    }

    // Filter to only parent products
    const parentRows = cleanedRows.filter((r) => r['Type'] === 'simple' || r['Type'] === 'variable');

    let updatedCount = 0;

    console.log(`🔍 Found ${parentRows.length} products to update...`);

    for (const row of parentRows) {
        const wpId = row['ID'];
        const dbTitle = row['Name'] || 'Untitled Product';

        // Grab the unformatted description from the raw map using the WP ID
        const originalDescription = rawDescMap.get(wpId);

        if (originalDescription) {
            // Update the product in the database where the title matches
            await db.update(schema.products)
                .set({ description: originalDescription })
                .where(eq(schema.products.title, dbTitle));

            updatedCount++;
            console.log(`✅ Restored HTML description for: ${dbTitle}`);
        }
    }

    console.log(`\n🎉 Done! Successfully restored ${updatedCount} original descriptions!`);
    await pool.end();
}

updateDescriptions().catch((err) => {
    console.error('❌ Update failed:', err);
    process.exit(1);
});