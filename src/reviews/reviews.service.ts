import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
    constructor(
        @Inject(DATABASE_CONNECTION)
        private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async create(userId: string, dto: CreateReviewDto) {
        // 1. Check if user has already reviewed this product
        const existingReview = await this.db.query.reviews.findFirst({
            where: and(
                eq(schema.reviews.userId, userId),
                eq(schema.reviews.productId, dto.productId),
            ),
        });

        if (existingReview) {
            throw new BadRequestException('You have already reviewed this product');
        }

        // 2. VERIFIED PURCHASE CHECK
        // Check if user has a DELIVERED order containing this product
        const purchase = await this.db
            .select()
            .from(schema.orderItems)
            .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
            .where(
                and(
                    eq(schema.orders.userId, userId),
                    eq(schema.orderItems.productId, dto.productId),
                    eq(schema.orders.status, 'delivered'), // Only allow if delivered
                ),
            )
            .limit(1);

        if (purchase.length === 0) {
            throw new ForbiddenException(
                'You can only review products you have purchased and received.',
            );
        }

        return await this.db.transaction(async (tx) => {
            // 3. Create Review
            const [review] = await tx
                .insert(schema.reviews)
                .values({
                    userId,
                    productId: dto.productId,
                    rating: dto.rating,
                    content: dto.content,
                })
                .returning();

            // 4. Update Product Stats (Average Rating & Total Reviews)
            // We recalculate from scratch to ensure accuracy
            const stats = await tx
                .select({
                    count: sql<number>`count(*)`,
                    avg: sql<string>`avg(${schema.reviews.rating})`,
                })
                .from(schema.reviews)
                .where(eq(schema.reviews.productId, dto.productId));

            const totalReviews = Number(stats[0].count);
            const avgRating = Number(stats[0].avg).toFixed(2);

            await tx
                .update(schema.products)
                .set({
                    totalReviews: totalReviews,
                    averageRating: avgRating,
                })
                .where(eq(schema.products.id, dto.productId));

            return review;
        });
    }

    async getProductReviews(productId: string) {
        return await this.db.query.reviews.findMany({
            where: eq(schema.reviews.productId, productId),
            with: {
                user: true, // To get reviewer name/avatar
            },
            orderBy: [desc(schema.reviews.createdAt)],
        });
    }

    // Helper to check if a user CAN review (for UI state)
    async checkEligibility(userId: string, productId: string) {
        const existing = await this.db.query.reviews.findFirst({
            where: and(
                eq(schema.reviews.userId, userId),
                eq(schema.reviews.productId, productId),
            ),
        });
        if (existing) return { canReview: false, reason: 'reviewed' };

        const purchase = await this.db
            .select()
            .from(schema.orderItems)
            .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
            .where(
                and(
                    eq(schema.orders.userId, userId),
                    eq(schema.orderItems.productId, productId),
                    eq(schema.orders.status, 'delivered'),
                ),
            )
            .limit(1);

        if (purchase.length === 0) return { canReview: false, reason: 'no_purchase' };

        return { canReview: true };
    }
}