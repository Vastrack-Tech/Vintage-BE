// revert-descriptions.ts
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

async function revertDescriptions() {
    console.log('⏪ Reverting back to Clean Plain Text Descriptions...');

    const cleanedRows: any[] = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream('final_cleaned_products_text.csv')
            .pipe(csv())
            .on('data', (data) => cleanedRows.push(data))
            .on('end', resolve)
            .on('error', reject);
    });

    let revertedCount = 0;

    const parentRows = cleanedRows.filter((r) => r['Type'] === 'simple' || r['Type'] === 'variable');

    for (const row of parentRows) {
        const dbTitle = row['Name'] || 'Untitled Product';
        const cleanDescription = row['Description'] || '';

        if (cleanDescription) {
            await db.update(schema.products)
                .set({ description: cleanDescription })
                .where(eq(schema.products.title, dbTitle));

            revertedCount++;
            console.log(`✅ Reverted to plain text for: ${dbTitle}`);
        }
    }

    console.log(`\n🎉 Done! Successfully reverted ${revertedCount} descriptions!`);
    await pool.end();
}

revertDescriptions().catch((err) => {
    console.error('❌ Revert failed:', err);
    process.exit(1);
});