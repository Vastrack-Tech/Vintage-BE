import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProvider = {
  provide: DATABASE_CONNECTION,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL')

    const pool = new Pool({
      connectionString,
      // max: 20, // Optional: Limit connection pool size
      // ssl: { rejectUnauthorized: false } // Optional: Needed for some cloud DBs (Neon/Render)
    });

    return drizzle(pool, { schema });
  },
};