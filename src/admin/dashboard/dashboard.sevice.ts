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
        // Run all independent aggregation queries in parallel for performance
        const [productCountRes, inventoryRes, orderStatsRes] = await Promise.all([

            // 1. TOTAL PRODUCTS (Distinct count of products)
            this.db
                .select({ count: count(schema.products.id) })
                .from(schema.products),

            // 2. INVENTORY VALUE (Sum of Variant Stock * Price)
            // We join variants to products to access the fallback base price
            this.db
                .select({
                    value: sum(
                        sql`COALESCE(${schema.variants.priceOverrideNgn}, ${schema.products.priceNgn}) * ${schema.variants.stockQuantity}`
                    ),
                })
                .from(schema.variants)
                .innerJoin(schema.products, eq(schema.variants.productId, schema.products.id)),

            // 3. TOTAL ORDERS & SALES (Valid orders only)
            this.db
                .select({
                    totalOrders: count(schema.orders.id),
                    totalSales: sum(schema.orders.totalAmountNgn),
                })
                .from(schema.orders)
                .where(notInArray(schema.orders.status, ['cancelled', 'pending'])),
        ]);

        // 4. Format Data (Handle nulls resulting from empty tables)
        const totalProducts = Number(productCountRes[0]?.count || 0);
        const inventoryValue = Number(inventoryRes[0]?.value || 0);
        const totalOrders = Number(orderStatsRes[0]?.totalOrders || 0);
        const totalSales = Number(orderStatsRes[0]?.totalSales || 0);

        return {
            totalProducts,
            inventoryValue,
            totalOrders,
            totalSales,
            // Mock trends (Calculate these dynamically in V2 using date ranges)
            trends: {
                products: 12,
                inventory: 5,
                orders: 25,
                sales: 18,
            },
        };
    }
}