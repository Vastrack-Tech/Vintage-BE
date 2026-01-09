import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { sql, eq, notInArray, count, sum } from 'drizzle-orm';

@Injectable()
export class DashboardService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async getDashboardSummary() {
        // 1. PRODUCTS & INVENTORY
        // We join products with variants to calculate total potential revenue held in stock
        // Logic: If variant has override price, use it. Else use product base price.
        const inventoryStats = await this.db
            .select({
                totalProducts: count(schema.products.id),
                inventoryValue: sum(
                    sql`COALESCE(${schema.variants.priceOverrideNgn}, ${schema.products.priceNgn}) * ${schema.variants.stockQuantity}`
                ),
            })
            .from(schema.products)
            .leftJoin(schema.variants, eq(schema.products.id, schema.variants.productId));

        // 2. ORDERS & SALES
        // We only count 'valid' sales (e.g., paid, shipped, delivered)
        const orderStats = await this.db
            .select({
                totalOrders: count(schema.orders.id),
                totalSales: sum(schema.orders.totalAmountNgn),
            })
            .from(schema.orders)
            .where(notInArray(schema.orders.status, ['cancelled', 'pending']));

        // 3. Extract Values (Handle nulls if DB is empty)
        const totalProducts = Number(inventoryStats[0]?.totalProducts || 0);
        const inventoryValue = Number(inventoryStats[0]?.inventoryValue || 0);
        const totalOrders = Number(orderStats[0]?.totalOrders || 0);
        const totalSales = Number(orderStats[0]?.totalSales || 0);

        return {
            totalProducts,
            inventoryValue,
            totalOrders,
            totalSales,
            // Mock trends for UI (In a real app, you'd calculate vs last month)
            trends: {
                products: 12,
                inventory: 5,
                orders: 25,
                sales: 18
            }
        };
    }
}