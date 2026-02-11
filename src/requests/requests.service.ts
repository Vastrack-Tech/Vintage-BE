import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateRequestDto } from './dto/create-request.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class RequestsService {
    constructor(
        @Inject(DATABASE_CONNECTION)
        private readonly db: NodePgDatabase<typeof schema>,
        private readonly mailService: MailService,
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

        await this.mailService.sendNewRequestAlert({
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            request: dto.request,
        });

        return newRequest;
    }
}