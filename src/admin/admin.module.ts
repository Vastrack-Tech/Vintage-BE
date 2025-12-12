import { Module } from '@nestjs/common';

import { AdminInventoryModule } from './inventory/inventory.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
    
    imports: [AdminInventoryModule, DashboardModule],
})
export class AdminModule { }