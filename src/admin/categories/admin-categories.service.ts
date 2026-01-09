import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, ilike, sql, and, SQL, desc } from 'drizzle-orm';
import { GetAdminCategoriesDto } from './dto/get-admin-categories.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class AdminCategoriesService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async findAll(query: GetAdminCategoriesDto) {
        const { page = 1, limit = 10, search } = query;
        const offset = (page - 1) * limit;

        const filters: SQL[] = [];

        if (search) {
            filters.push(ilike(schema.categories.name, `%${search}%`));
        }

        // CTE: Product Stats (Count, Quantity & Value)
        const productStats = this.db
            .select({
                categoryId: schema.products.categoryId,
                productsCount: sql<number>`count(${schema.products.id})`.as('prod_count'), // 👈 NEW: Count unique products
                totalQuantity: sql<number>`sum(${schema.products.stockQuantity})`.as('total_qty'),
                totalValue: sql<number>`sum(${schema.products.stockQuantity} * cast(${schema.products.priceNgn} as decimal))`.as('total_val'),
            })
            .from(schema.products)
            .groupBy(schema.products.categoryId)
            .as('product_stats');

        // CTE: Sales Stats
        const salesStats = this.db
            .select({
                categoryId: schema.products.categoryId,
                totalSales: sql<number>`sum(cast(${schema.orderItems.priceAtPurchaseNgn} as decimal) * ${schema.orderItems.quantity})`.as('total_sales'),
            })
            .from(schema.orderItems)
            .leftJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
            .groupBy(schema.products.categoryId)
            .as('sales_stats');

        // Main Query
        const baseQuery = this.db
            .select({
                id: schema.categories.id,
                name: schema.categories.name,
                updatedAt: schema.categories.updatedAt,
                // Coalesce results
                productsCount: sql<number>`coalesce(${productStats.productsCount}, 0)`, // 👈 Return this
                totalQuantity: sql<number>`coalesce(${productStats.totalQuantity}, 0)`,
                totalValue: sql<number>`coalesce(${productStats.totalValue}, 0)`,
                totalSales: sql<number>`coalesce(${salesStats.totalSales}, 0)`,
            })
            .from(schema.categories)
            .leftJoin(productStats, eq(schema.categories.id, productStats.categoryId))
            .leftJoin(salesStats, eq(schema.categories.id, salesStats.categoryId))
            .where(and(...filters))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(schema.categories.updatedAt));

        const [data, totalCount] = await Promise.all([
            baseQuery,
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(schema.categories)
                .where(and(...filters))
                .then((res) => Number(res[0]?.count || 0)),
        ]);

        return {
            data,
            meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
        };
    }

    async create(dto: CreateCategoryDto) {
        const [created] = await this.db
            .insert(schema.categories)
            .values({
                name: dto.name,
                description: dto.description,
            })
            .returning();
        return created;
    }

    async update(id: string, dto: UpdateCategoryDto) {
        const [updated] = await this.db
            .update(schema.categories)
            .set({
                ...dto,
                // FIX 4: Correctly updates the timestamp
                updatedAt: new Date(),
            })
            .where(eq(schema.categories.id, id))
            .returning();

        if (!updated) throw new NotFoundException('Category not found');
        return updated;
    }

    async remove(id: string) {
        const [deleted] = await this.db
            .delete(schema.categories)
            .where(eq(schema.categories.id, id))
            .returning();

        if (!deleted) throw new NotFoundException('Category not found');
        return deleted;
    }
}