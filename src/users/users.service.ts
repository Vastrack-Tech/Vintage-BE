import {
  Inject,
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/address.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) { }

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
    // Separate birthday from the rest to handle date conversion
    const { birthday, ...rest } = dto;

    const [updatedUser] = await this.db
      .update(schema.users)
      .set({
        ...rest,
        ...(birthday ? { birthday: new Date(birthday) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    return await this.db.transaction(async (tx) => {
      // 1. If this is the first address, make it default automatically
      const existingCount = await tx.select({ count: sql<number>`count(*)` })
        .from(schema.addresses)
        .where(eq(schema.addresses.userId, userId));

      let isDefault = dto.isDefault || Number(existingCount[0].count) === 0;

      // 2. If setting as default, unset others
      if (isDefault) {
        await tx.update(schema.addresses)
          .set({ isDefault: false })
          .where(eq(schema.addresses.userId, userId));
      }

      // 3. Create
      const [newAddress] = await tx.insert(schema.addresses).values({
        userId,
        ...dto,
        isDefault,
      }).returning();

      return newAddress;
    });
  }

  async getAddresses(userId: string) {
    return await this.db.query.addresses.findMany({
      where: eq(schema.addresses.userId, userId),
      orderBy: (addresses, { desc }) => [desc(addresses.isDefault), desc(addresses.createdAt)],
    });
  }
}
