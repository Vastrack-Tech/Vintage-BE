import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, desc, and, ilike, sql, or, gte, lte, SQL } from 'drizzle-orm';
import { GetCustomersDto } from './dto/get-customers.dto';

@Injectable()
export class CustomersService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async findAll(query: GetCustomersDto) {
        const { page = 1, limit = 10, search, minOrderValue, maxOrderValue, startDate, endDate } = query;
        const offset = (page - 1) * limit;

        const filters: SQL[] = [eq(schema.users.role, 'customer')];

        // 1. Search Filter
        if (search) {
            const searchFilter = or(
                ilike(schema.users.firstName, `%${search}%`),
                ilike(schema.users.lastName, `%${search}%`),
                ilike(schema.users.email, `%${search}%`),
                ilike(schema.users.phone, `%${search}%`)
            );

            if (searchFilter) {
                filters.push(searchFilter);
            }
        }

        // 2. Date of Birth Filter
        if (startDate) {
            filters.push(gte(schema.users.birthday, new Date(startDate)));
        }
        if (endDate) {
            filters.push(lte(schema.users.birthday, new Date(endDate)));
        }

        // 3. Subquery for Total Order Value
        const totalOrderValueSq = this.db
            .select({
                userId: schema.orders.userId,
                totalValue: sql<number>`sum(cast(${schema.orders.totalAmountNgn} as decimal))`.as('total_value'),
            })
            .from(schema.orders)
            .groupBy(schema.orders.userId)
            .as('user_orders');

        // 4. Build Main Query
        const baseQuery = this.db
            .select({
                id: schema.users.id,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
                email: schema.users.email,
                phone: schema.users.phone,
                birthday: schema.users.birthday,
                createdAt: schema.users.createdAt,

                // ---------------------------------------------------------
                // SMART ADDRESS PARSING
                // ---------------------------------------------------------
                // Logic: 
                // 1. Try to combine address parts from 'addresses' table using ", " separator
                // 2. If that is empty/null, fall back to the legacy 'users.address' column
                address: sql<string>`
                    COALESCE(
                        NULLIF(
                            CONCAT_WS(', ', 
                                ${schema.addresses.addressLine}, 
                                ${schema.addresses.city}, 
                                ${schema.addresses.state}, 
                                ${schema.addresses.postalCode}
                            ), 
                            ''
                        ),
                        ${schema.users.address}
                    )
                `,

                // Aggregated Data
                totalOrderValue: sql<number>`coalesce(${totalOrderValueSq.totalValue}, 0)`,
            })
            .from(schema.users)
            .leftJoin(totalOrderValueSq, eq(schema.users.id, totalOrderValueSq.userId))
            // Join Default Address Only
            .leftJoin(schema.addresses, and(
                eq(schema.addresses.userId, schema.users.id),
                eq(schema.addresses.isDefault, true)
            ))
            .where(and(...filters))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(schema.users.createdAt));

        const [data, totalCount] = await Promise.all([
            baseQuery,
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(schema.users)
                .where(and(...filters))
                .then(res => Number(res[0]?.count || 0))
        ]);

        return {
            data,
            meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
        };
    }
}