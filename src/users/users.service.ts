import { Inject, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createProfile(userId: string, dto: CreateProfileDto) {
    const existing = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId), // Check by UUID
    });

    if (existing) {
      throw new ConflictException('Profile already exists');
    }

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

  async updateUser(userId: string, dto: UpdateUserDto) {
    const [updatedUser] = await this.db
      .update(schema.users)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }
}
