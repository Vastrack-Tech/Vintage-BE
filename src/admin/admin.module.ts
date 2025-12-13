import { Module } from '@nestjs/common';

import { AdminInventoryModule } from './inventory/inventory.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminOrdersModule } from './orders/admin-orders.module';

@Module({

    imports: [AdminInventoryModule, DashboardModule, AdminOrdersModule],
})
export class AdminModule { }