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
import { eq, and, desc, inArray } from 'drizzle-orm';
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

    const filters: any[] = [eq(schema.orders.userId, userId)];

    if (status === OrderFilterStatus.COMPLETED) {
      filters.push(inArray(schema.orders.status, ['delivered', 'shipped', 'cancelled']));
    } else if (status === OrderFilterStatus.ACTIVE) {
      filters.push(inArray(schema.orders.status, ['pending', 'paid', 'processing']));
    }

    const data = await this.db.query.orders.findMany({
      where: and(...filters),
      limit: limit,
      offset: offset,
      orderBy: desc(schema.orders.createdAt),
      with: {
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });

    return { data, meta: { page, limit } };
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    return await this.db.transaction(async (tx) => {
      // 👇 FIX: Strictly type the array as string[] by filtering out undefined/null
      const variantIds = dto.items
        .map((i) => i.variantId)
        .filter((id): id is string => !!id);

      // Only fetch variants if there are any to fetch
      const dbVariants = variantIds.length > 0
        ? await tx.query.variants.findMany({
          where: inArray(schema.variants.id, variantIds),
          with: { product: true },
        })
        : [];

      // Check validation only for items that HAVE a variantId
      if (variantIds.length > 0 && dbVariants.length !== variantIds.length) {
        throw new NotFoundException('One or more product variants not found');
      }

      let totalNgn = 0;
      let totalUsd = 0;

      const orderItemsData: {
        variantId: string | null;
        productId: string;
        quantity: number;
        priceAtPurchaseNgn: string;
        priceAtPurchaseUsd: string;
      }[] = [];

      // Fetch all products involved to get prices for non-variant items
      const productIds = dto.items.map(i => i.productId);
      const dbProducts = await tx.query.products.findMany({
        where: inArray(schema.products.id, productIds)
      });

      for (const item of dto.items) {
        let priceNgn = 0;
        let priceUsd = 0;

        if (item.variantId) {
          const variant = dbVariants.find((v) => v.id === item.variantId);
          if (!variant) throw new NotFoundException('Variant not found');

          priceNgn = variant.priceOverrideNgn
            ? Number(variant.priceOverrideNgn)
            : Number(variant.product.priceNgn);

          priceUsd = variant.priceOverrideUsd
            ? Number(variant.priceOverrideUsd)
            : Number(variant.product.priceUsd);
        } else {
          const product = dbProducts.find(p => p.id === item.productId);
          if (!product) throw new NotFoundException('Product not found');

          priceNgn = Number(product.priceNgn);
          priceUsd = Number(product.priceUsd);
        }

        totalNgn += priceNgn * item.quantity;
        totalUsd += priceUsd * item.quantity;

        orderItemsData.push({
          variantId: item.variantId || null,
          productId: item.productId,
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
          currencyPaid: 'NGN',
          status: 'pending',
        })
        .returning();

      if (orderItemsData.length > 0) {
        await tx.insert(schema.orderItems).values(
          orderItemsData.map((item) => ({
            orderId: newOrder.id,
            ...item,
          })),
        );
      }

      return newOrder;
    });
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Cannot cancel an order that is already paid or shipped',
      );
    }

    const [updatedOrder] = await this.db
      .update(schema.orders)
      .set({ status: 'cancelled' })
      .where(eq(schema.orders.id, orderId))
      .returning();

    return updatedOrder;
  }
}