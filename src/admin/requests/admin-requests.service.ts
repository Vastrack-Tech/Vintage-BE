import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, desc, ilike, or, and, sql, SQL } from 'drizzle-orm';
import { GetRequestsDto } from './dto/get-requests.dto';

@Injectable()
export class AdminRequestsService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async findAll(query: GetRequestsDto) {
        const { page = 1, limit = 10, search, status } = query;
        const offset = (page - 1) * limit;

        const filters: SQL[] = [];

        // 1. Status Filter
        if (status) {
            filters.push(eq(schema.contactRequests.status, status));
        }

        if (search) {
            const searchLower = `%${search}%`;

            const searchFilter = or(
                ilike(schema.contactRequests.firstName, searchLower),
                ilike(schema.contactRequests.lastName, searchLower),
                ilike(schema.contactRequests.email, searchLower),
                ilike(schema.contactRequests.request, searchLower),
            );

            // Only push if searchFilter is defined
            if (searchFilter) {
                filters.push(searchFilter);
            }
        }

        const whereClause = filters.length > 0 ? and(...filters) : undefined;

        // Execute Query
        const [data, countResult] = await Promise.all([
            this.db.select()
                .from(schema.contactRequests)
                .where(whereClause)
                .limit(limit)
                .offset(offset)
                .orderBy(desc(schema.contactRequests.createdAt)),

            this.db.select({ count: sql<number>`count(*)` })
                .from(schema.contactRequests)
                .where(whereClause)
        ]);

        const total = Number(countResult[0]?.count || 0);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async updateStatus(id: string, status: string) {
        const [updated] = await this.db
            .update(schema.contactRequests)
            .set({ status })
            .where(eq(schema.contactRequests.id, id))
            .returning();

        if (!updated) throw new NotFoundException('Request not found');
        return updated;
    }

    async remove(id: string) {
        const [deleted] = await this.db
            .delete(schema.contactRequests)
            .where(eq(schema.contactRequests.id, id))
            .returning();

        if (!deleted) throw new NotFoundException('Request not found');
        return { success: true };
    }
}