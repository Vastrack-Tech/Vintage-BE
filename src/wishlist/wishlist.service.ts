import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class WishlistService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async toggleWishlist(userId: string, productId: string) {
        // 1. Check if exists
        const existing = await this.db.query.wishlists.findFirst({
            where: and(
                eq(schema.wishlists.userId, userId),
                eq(schema.wishlists.productId, productId)
            ),
        });

        if (existing) {
            // 2. Remove if exists
            await this.db.delete(schema.wishlists)
                .where(eq(schema.wishlists.id, existing.id));
            return { message: 'Removed from wishlist', action: 'removed' };
        } else {
            // 3. Add if not exists
            await this.db.insert(schema.wishlists).values({
                userId,
                productId,
            });
            return { message: 'Added to wishlist', action: 'added' };
        }
    }

    async getMyWishlist(userId: string) {
        const items = await this.db.query.wishlists.findMany({
            where: eq(schema.wishlists.userId, userId),
            with: {
                product: true, // Fetch the actual product details
            },
            orderBy: (t, { desc }) => [desc(t.createdAt)],
        });

        // Flatten the response so the frontend gets a list of products directly
        return items.map(item => item.product);
    }
}