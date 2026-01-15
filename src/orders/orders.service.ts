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

  // 👇 UPDATED: userId is now OPTIONAL to support Public Tracking
  async getOrderById(orderId: string, userId?: string) {

    // 1. Build Query Filters
    const filters = [eq(schema.orders.id, orderId)];

    // 2. If userId is provided (Logged In User), enforce ownership
    if (userId) {
      filters.push(eq(schema.orders.userId, userId));
    }

    const order = await this.db.query.orders.findFirst({
      where: and(...filters),
      with: {
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      // Security: If a user tries to access another user's order, 
      // we throw 'Not Found' instead of 'Forbidden' to avoid leaking existence.
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // 👇 UPDATED: To support Schema changes (Address/Contact Snapshots)
  async createOrder(userId: string | null, dto: CreateOrderDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Filter Variants
      const variantIds = dto.items
        .map((i) => i.variantId)
        .filter((id): id is string => !!id);

      const dbVariants = variantIds.length > 0
        ? await tx.query.variants.findMany({
          where: inArray(schema.variants.id, variantIds),
          with: { product: true },
        })
        : [];

      if (variantIds.length > 0 && dbVariants.length !== variantIds.length) {
        throw new NotFoundException('One or more product variants not found');
      }

      let totalNgn = 0;
      let totalUsd = 0;

      const orderItemsData: any[] = [];

      // Fetch Products
      const productIds = dto.items.map(i => i.productId);
      const dbProducts = await tx.query.products.findMany({
        where: inArray(schema.products.id, productIds)
      });

      for (const item of dto.items) {
        let priceNgn = 0;
        let priceUsd = 0;
        let variantName: string | null = null;

        if (item.variantId) {
          const variant = dbVariants.find((v) => v.id === item.variantId);
          if (!variant) throw new NotFoundException('Variant not found');

          priceNgn = variant.priceOverrideNgn ? Number(variant.priceOverrideNgn) : Number(variant.product.priceNgn);
          priceUsd = variant.priceOverrideUsd ? Number(variant.priceOverrideUsd) : Number(variant.product.priceUsd);
          variantName = variant.name;
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
          variantName, // Save snapshot name
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchaseNgn: priceNgn.toString(),
          priceAtPurchaseUsd: priceUsd.toFixed(2),
        });
      }

      // 2. Insert Order (With Snapshots)
      // Note: If creating manually via this service, ensure DTO has these fields 
      // or pass defaults/nulls if strictly internal.
      const [newOrder] = await tx
        .insert(schema.orders)
        .values({
          userId, // Can be null
          email: dto.guestEmail || 'system@internal.com', // Fallback for manual creation
          firstName: dto.guestName || 'System',
          shippingAddress: dto.shippingAddress || {}, // Ensure DTO has this

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

    // Only allow user who owns it to cancel (if it has an owner)
    if (order.userId && order.userId !== userId) {
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