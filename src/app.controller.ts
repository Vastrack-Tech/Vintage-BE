import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from './database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './database/schema';
import { sql } from 'drizzle-orm';

@Controller()
export class AppController {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  @Get('health')
  async getHealth() {
    try {
      await this.db.execute(sql`SELECT 1`);

      return {
        status: 'ok',
        message: 'Vintage-BE is running',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', database: 'disconnected' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
