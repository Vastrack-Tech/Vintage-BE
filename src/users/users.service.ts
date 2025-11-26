import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { CreateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createProfile(userId: string, dto: CreateProfileDto) {
    // 1. Check if profile already exists to prevent duplicates
    const existing = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId), // Check by UUID
    });

    if (existing) {
      throw new ConflictException('Profile already exists');
    }

    // 2. Create the user in YOUR local database
    // We use the 'userId' from Supabase as our Primary Key
    const [newUser] = await this.db
      .insert(schema.users)
      .values({
        id: userId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'customer',
      })
      .returning();

    return newUser;
  }
}
