import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
    constructor(
        @Inject(DATABASE_CONNECTION)
        private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async create(dto: CreateRequestDto) {
        const [newRequest] = await this.db
            .insert(schema.contactRequests)
            .values({
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                phone: dto.phone,
                request: dto.request,
            })
            .returning();

        // TODO: Optional - Send email notification to admin here

        return newRequest;
    }
}