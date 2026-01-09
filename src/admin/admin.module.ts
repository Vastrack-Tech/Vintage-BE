import { Module } from '@nestjs/common';

import { AdminInventoryModule } from './inventory/inventory.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminOrdersModule } from './orders/admin-orders.module';
import { AdminCustomersModule } from './customers/customer.module';
import { AdminCategoriesModule } from './categories/admin-categories.module';
import { AdminRequestsModule } from './requests/admin-requests.module';

@Module({
    imports: [AdminInventoryModule, DashboardModule, AdminOrdersModule, AdminCustomersModule, AdminCategoriesModule, AdminRequestsModule],
})
export class AdminModule { }