import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { GetOrdersDto, OrderFilterStatus } from './dto/get-oders.dto';
import { CreateOrderDto } from './dto/create-orders';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async getUserOrders(userId: string, dto: GetOrdersDto) {
    const { status = OrderFilterStatus.ALL, page = 1, limit = 10 } = dto;
    const offset = (page - 1) * limit;

    // 1. Build Filters
    const filters: any[] = [eq(schema.orders.userId, userId)];

    if (status === OrderFilterStatus.COMPLETED) {
      filters.push(inArray(schema.orders.status, ['delivered', 'shipped']));
    } else if (status === OrderFilterStatus.ACTIVE) {
      filters.push(inArray(schema.orders.status, ['pending', 'paid']));
    }

    // 2. Execute Query
    const data = await this.db.query.orders.findMany({
      where: and(...filters),
      limit: limit,
      offset: offset,
      orderBy: desc(schema.orders.createdAt),
      with: {
        items: {
          with: {
            variant: {
              with: {
                product: true, // To get the Image and Title
              },
            },
          },
        },
      },
    });

    // 3. Get Count (Simplified for brevity)
    // In production, use a separate count query for pagination metadata

    return { data, meta: { page, limit } };
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const RATE = 1500; // In real app, inject a CurrencyService here

    return await this.db.transaction(async (tx) => {
      const variantIds = dto.items.map((i) => i.variantId);

      const dbVariants = await tx.query.variants.findMany({
        where: inArray(schema.variants.id, variantIds),
        with: { product: true }
      });

      if (dbVariants.length !== variantIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      let totalNgn = 0;
      let totalUsd = 0;

      // Explicitly type the array to fix the 'never[]' error
      const orderItemsData: {
        variantId: string;
        quantity: number;
        priceAtPurchaseNgn: string;
        priceAtPurchaseUsd: string;
      }[] = [];

      for (const item of dto.items) {
        const variant = dbVariants.find((v) => v.id === item.variantId);
        if (!variant) throw new NotFoundException('Variant not found');

        // 1. Resolve NGN Price
        const priceNgn = variant.priceOverrideNgn
          ? Number(variant.priceOverrideNgn)
          : Number(variant.product.priceNgn); // Changed from basePrice

        // 2. Resolve USD Price
        const priceUsd = variant.priceOverrideUsd
          ? Number(variant.priceOverrideUsd)
          : Number(variant.product.priceUsd); // Changed from basePrice

        totalNgn += priceNgn * item.quantity;
        totalUsd += priceUsd * item.quantity;

        orderItemsData.push({
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtPurchaseNgn: priceNgn.toString(),
          priceAtPurchaseUsd: priceUsd.toFixed(2),
        });
      }

      const [newOrder] = await tx
        .insert(schema.orders)
        .values({
          userId,
          totalAmountNgn: totalNgn.toString(),
          totalAmountUsd: totalUsd.toFixed(2),
          currencyPaid: 'NGN', // Default or pass from DTO
          status: 'pending',
        })
        .returning();

      if (orderItemsData.length > 0) {
        await tx.insert(schema.orderItems).values(
          orderItemsData.map((item) => ({
            orderId: newOrder.id,
            ...item,
          }))
        );
      }

      return newOrder;
    });
  }
  // 2. CANCEL ORDER
  async cancelOrder(userId: string, orderId: string) {
    // A. Find Order
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
    });

    if (!order) throw new NotFoundException('Order not found');

    // B. Security Check: Does it belong to user?
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    // C. Logic Check: Is it too late?
    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Cannot cancel an order that is already paid or shipped',
      );
    }

    // D. Update Status
    const [updatedOrder] = await this.db
      .update(schema.orders)
      .set({ status: 'cancelled' }) // Ensure 'cancelled' is in your Enum!
      .where(eq(schema.orders.id, orderId))
      .returning();

    return updatedOrder;
  }
}
