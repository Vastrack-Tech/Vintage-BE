import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.sevice';
import { DashboardController } from './dashboard.controller';

@Module({
    providers: [DashboardService],
    controllers: [DashboardController]
})
export class DashboardModule {}
