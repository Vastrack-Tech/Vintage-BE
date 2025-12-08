import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/address.dto';
import { ChangePasswordDto, UpdateNotificationDto } from './dto/settings.dto';
import { generateId } from '../database/schema';

@Injectable()
export class UsersService {
  private supabaseAdmin;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private config: ConfigService,
  ) {
    // Initialize Supabase Admin for privileged actions (Password Updates)
    this.supabaseAdmin = createClient(
      config.getOrThrow('SUPABASE_URL'),
      config.getOrThrow('SUPABASE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }

  // --- EXISTING PROFILE METHODS ---

  async createProfile(userId: string, dto: CreateProfileDto) {
    return await this.db.transaction(async (tx) => {
      const existing = await tx.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (existing) {
        throw new ConflictException('Profile already exists');
      }

      const [newUser] = await tx
        .insert(schema.users)
        .values({
          id: userId,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'customer',
        })
        .returning();

      // 3. Handle Referral Logic (using tx)
      if (dto.referralCode) {
        // Find the referrer
        const referrerRef = await tx.query.referrals.findFirst({
          where: eq(schema.referrals.code, dto.referralCode),
        });

        if (referrerRef) {
          // Create the referral record
          await tx.insert(schema.referrals).values({
            id: generateId('VINREF'),
            referrerId: referrerRef.referrerId,
            refereeId: userId,
            code: dto.referralCode,
            status: 'completed',
            rewardAmount: 0,
          });
        }
      }

      return newUser;
    });
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const { birthday, ...rest } = dto;
    console.log(rest);
    const [updatedUser] = await this.db
      .update(schema.users)
      .set({
        ...rest,
        ...(birthday ? { birthday: new Date(birthday) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    console.log(updatedUser);


    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  // --- EXISTING ADDRESS METHODS ---

  async addAddress(userId: string, dto: CreateAddressDto) {
    return await this.db.transaction(async (tx) => {
      const existingCount = await tx.select({ count: sql<number>`count(*)` })
        .from(schema.addresses)
        .where(eq(schema.addresses.userId, userId));

      let isDefault = dto.isDefault || Number(existingCount[0].count) === 0;

      if (isDefault) {
        await tx.update(schema.addresses)
          .set({ isDefault: false })
          .where(eq(schema.addresses.userId, userId));
      }

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

  // --- NEW SETTINGS METHODS ---

  async updateNotifications(userId: string, dto: UpdateNotificationDto) {
    const [updated] = await this.db
      .update(schema.users)
      .set(dto)
      .where(eq(schema.users.id, userId))
      .returning();

    return updated;
  }

  async changePassword(userId: string, email: string, dto: ChangePasswordDto) {
    // A. Verify Old Password
    const publicSupabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_KEY')
    );

    const { error: signInError } = await publicSupabase.auth.signInWithPassword({
      email,
      password: dto.currentPassword,
    });

    if (signInError) {
      throw new ConflictException('Current password is incorrect');
    }

    // B. Update to New Password (using Admin)
    const { error: updateError } = await this.supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: dto.newPassword }
    );

    if (updateError) {
      throw new BadRequestException('Failed to update password');
    }

    return { message: 'Password updated successfully' };
  }
}