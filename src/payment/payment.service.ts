import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import * as crypto from 'crypto';
import axios from 'axios';

interface CheckoutPayload {
  amountNgn: number;
  amountUsd: number;
  currency: 'NGN' | 'USD';
  items: {
    productId: string;
    variantId: string;
    quantity: number;
    priceNgn: number;
    priceUsd: number;
  }[];
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) { }

  async initializePayment(user: { email: string; userId: string }, payload: CheckoutPayload) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');
    const callbackUrl = `${this.configService.get('FRONTEND_URL') || 'https://vintagefrontend-i6mpc.ondigitalocean.app'}/payment/callback`;

    const chargeAmount = payload.currency === 'USD'
      ? payload.amountUsd
      : payload.amountNgn;

    const order = await this.db.transaction(async (tx) => {
      const productIds = payload.items.map((i) => i.productId);
      const variantIds = payload.items
        .filter((i) => i.variantId)
        .map((i) => i.variantId);

      const dbProducts = await tx.query.products.findMany({
        where: inArray(schema.products.id, productIds),
      });

      const dbVariants = variantIds.length > 0
        ? await tx.query.variants.findMany({
          where: inArray(schema.variants.id, variantIds),
        })
        : [];

      for (const item of payload.items) {
        if (item.variantId) {
          const variant = dbVariants.find((v) => v.id === item.variantId);

          if (!variant) {
            throw new BadRequestException(`Variant for product ${item.productId} not found`);
          }

          if ((variant.stockQuantity || 0) < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${variant.name}`);
          }
        } else {
          const product = dbProducts.find((p) => p.id === item.productId);

          if (!product) {
            throw new BadRequestException(`Product not found`);
          }

          if ((product.stockQuantity || 0) < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${product.title}`);
          }
        }
      }

      const [newOrder] = await tx
        .insert(schema.orders)
        .values({
          userId: user.userId,
          totalAmountNgn: payload.amountNgn.toString(),
          totalAmountUsd: payload.amountUsd.toString(),
          status: 'pending',
          currencyPaid: payload.currency,
        })
        .returning();

      if (payload.items.length > 0) {
        await tx.insert(schema.orderItems).values(
          payload.items.map((item) => ({
            orderId: newOrder.id,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            priceAtPurchaseNgn: item.priceNgn.toString(),
            priceAtPurchaseUsd: item.priceUsd.toString(),
          }))
        );
      }
      return newOrder;
    });

    // C. Initialize Paystack
    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: user.email,
          amount: Math.round(chargeAmount * 100),
          currency: payload.currency,
          metadata: {
            userId: user.userId,
            orderId: order.id,
          },
          callback_url: callbackUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data.data;

      await this.db.insert(schema.payments).values({
        userId: user.userId,
        orderId: order.id,
        reference: data.reference,
        amount: chargeAmount.toString(),
        currency: payload.currency,
        status: 'pending',
      });

      return data;
    } catch (error: any) {
      console.error('Paystack Init Error:', error.response?.data || error.message);
      throw new BadRequestException('Payment initialization failed');
    }
  }

  async verifyPayment(reference: string) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      );

      const data = response.data.data;

      if (data.status === 'success') {
        await this.fulfillOrder(reference, data);
      }

      return data;
    } catch (error: any) {
      console.error('Paystack Verify Error:', error.response?.data || error.message);
      throw new BadRequestException('Payment verification failed');
    }
  }

  // 3. WEBHOOK (Backend Notification)
  async handleWebhook(signature: string, payload: any) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid signature');
    }

    const event = payload.event;
    const data = payload.data;

    if (event === 'charge.success') {
      await this.fulfillOrder(data.reference, data);
    }

    return { status: 'ok' };
  }

  private async fulfillOrder(reference: string, metadata: any) {
    await this.db.transaction(async (tx) => {
      const payment = await tx.query.payments.findFirst({
        where: eq(schema.payments.reference, reference),
      });

      if (!payment || payment.status === 'success') return;

      await tx
        .update(schema.payments)
        .set({ status: 'success', metadata: metadata })
        .where(eq(schema.payments.reference, reference));

      if (payment.orderId) {
        await tx
          .update(schema.orders)
          .set({ status: 'paid' })
          .where(eq(schema.orders.id, payment.orderId));

        const items = await tx.query.orderItems.findMany({
          where: eq(schema.orderItems.orderId, payment.orderId),
        });

        for (const item of items) {
          if (item.variantId) {
            await tx
              .update(schema.variants)
              .set({
                stockQuantity: sql`${schema.variants.stockQuantity} - ${item.quantity}`,
              })
              .where(eq(schema.variants.id, item.variantId));
          } else {
            await tx
              .update(schema.products)
              .set({
                stockQuantity: sql`${schema.products.stockQuantity} - ${item.quantity}`,
              })
              .where(eq(schema.products.id, item.productId));
          }
        }

        console.log(`✅ Order ${payment.orderId} paid & stock updated.`);
      }
    });
  }
}