import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';

@Injectable()
export class SupportService {
    constructor(@Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>) { }

    // 1. Send Contact Message
    async createContactMessage(dto: { name: string; email: string; phone?: string; message: string }) {
        await this.db.insert(schema.contactMessages).values(dto);
        return { message: 'Message sent successfully' };
    }

    // 2. Get Referral Code (Generate if not exists)
    async getReferralCode(userId: string) {
        // Check if user already has a code
        const existing = await this.db.query.referrals.findFirst({
            where: eq(schema.referrals.referrerId, userId),
        });

        if (existing) return { code: existing.code, link: `https://hairbyvintage.com?ref=${existing.code}` };

        // Generate new code (First 3 letters of name + random)
        const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 5);
        const code = `VIN-${nanoid()}`;

        await this.db.insert(schema.referrals).values({
            referrerId: userId,
            code,
        });

        return { code, link: `https://hairbyvintage.com?ref=${code}` };
    }
}