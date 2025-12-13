import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, desc, and, ilike, sql, or, SQL } from 'drizzle-orm'; // 👈 Added SQL import
import { GetOrdersDto } from './dto/get-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class AdminOrdersService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async findAll(query: GetOrdersDto) {
        const { page = 1, limit = 10, search, status } = query;
        const offset = (page - 1) * limit;

        // FIX 1: Explicitly type the array as SQL[] so we can push to it
        const filters: SQL[] = [];

        if (status) {
            // Cast status to any to satisfy Drizzle's enum type check
            filters.push(eq(schema.orders.status, status as any));
        }

        if (search) {
            // Search by Order ID OR User First Name
            // FIX 2: 'or' returns SQL | undefined, but since we have valid args, 
            // we can assert it exists or simply push it as is because filters expects SQL items.
            const searchFilter = or(
                ilike(schema.orders.id, `%${search}%`),
                ilike(schema.users.firstName, `%${search}%`)
            );

            if (searchFilter) {
                filters.push(searchFilter);
            }
        }

        const whereClause = filters.length > 0 ? and(...filters) : undefined;

        // Execute Query with Joins
        const [data, totalCount] = await Promise.all([
            this.db.select({
                id: schema.orders.id,
                totalAmountNgn: schema.orders.totalAmountNgn,
                status: schema.orders.status,
                createdAt: schema.orders.createdAt,
                user: {
                    firstName: schema.users.firstName,
                    lastName: schema.users.lastName,
                    email: schema.users.email,
                },
                itemCount: sql<number>`count(${schema.orderItems.id})`
            })
                .from(schema.orders)
                .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
                .leftJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
                .where(whereClause)
                .groupBy(schema.orders.id, schema.users.id)
                .limit(limit)
                .offset(offset)
                .orderBy(desc(schema.orders.createdAt)),

            // Get Total Count
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(schema.orders)
                .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
                .where(whereClause)
                .then((res) => Number(res[0]?.count || 0)),
        ]);

        return {
            data,
            meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
        };
    }

    async updateStatus(id: string, dto: UpdateOrderStatusDto) {
        const [updated] = await this.db
            .update(schema.orders)
            // FIX 3: Cast 'dto.status' to 'any' to fix the Enum vs String literal mismatch
            .set({ status: dto.status as any })
            .where(eq(schema.orders.id, id))
            .returning();

        if (!updated) throw new NotFoundException('Order not found');
        return updated;
    }

    async getStats() {
        const stats = await this.db
            .select({
                count: sql<number>`count(*)`,
                totalSales: sql<number>`sum(cast(${schema.orders.totalAmountNgn} as decimal))`,
                // Match the database Enum strings exactly
                pending: sql<number>`count(case when ${schema.orders.status} = 'pending' then 1 end)`,
                completed: sql<number>`count(case when ${schema.orders.status} = 'delivered' then 1 end)`, // 👈 Changed from 'completed' to 'delivered'
            })
            .from(schema.orders);

        return {
            totalOrders: Number(stats[0]?.count || 0),
            totalSales: Number(stats[0]?.totalSales || 0),
            pendingOrders: Number(stats[0]?.pending || 0),
            completedOrders: Number(stats[0]?.completed || 0),
        };
    }
}