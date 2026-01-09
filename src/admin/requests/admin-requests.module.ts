import { Module } from '@nestjs/common';
import { AdminRequestsService } from './admin-requests.service';
import { AdminRequestsController } from './admin-requests.controller';

@Module({
    controllers: [AdminRequestsController],
    providers: [AdminRequestsService],
})
export class AdminRequestsModule { }