import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import axios from 'axios';

// Interface for the checkout payload
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

  // 1. INITIALIZE PAYMENT (AND CREATE ORDER)
  async initializePayment(user: { email: string; userId: string }, payload: CheckoutPayload) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');
    const callbackUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/payment/callback`;

    // A. Determine Charge Amount based on Currency
    const chargeAmount = payload.currency === 'USD'
      ? payload.amountUsd
      : payload.amountNgn;

    // B. Start Transaction: Create Order & Items
    const order = await this.db.transaction(async (tx) => {
      // 1. Create Order Record
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

      // 2. Create Order Items
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
          amount: Math.round(chargeAmount * 100), // Convert to Kobo/Cents
          currency: payload.currency,             // Pass Currency
          metadata: {
            userId: user.userId,
            orderId: order.id,                    // Link Paystack ref to this Order
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

      // D. Create Payment Record (Linked to Order)
      await this.db.insert(schema.payments).values({
        userId: user.userId,
        orderId: order.id,
        reference: data.reference,
        amount: chargeAmount.toString(),
        currency: payload.currency,
        status: 'pending',
      });

      return data; // Returns { authorization_url, access_code, reference }
    } catch (error: any) {
      console.error('Paystack Init Error:', error.response?.data || error.message);
      throw new BadRequestException('Payment initialization failed');
    }
  }

  // 2. VERIFY PAYMENT (Frontend Callback)
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

    // Validate Signature
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

  // --- PRIVATE HELPER: Updates Payment, Order AND Inventory ---
  private async fulfillOrder(reference: string, metadata: any) {
    await this.db.transaction(async (tx) => {
      // 1. Find the payment
      const payment = await tx.query.payments.findFirst({
        where: eq(schema.payments.reference, reference),
      });

      // Idempotency check: If not found or already success, stop.
      if (!payment || payment.status === 'success') return;

      // 2. Update Payment Status
      await tx
        .update(schema.payments)
        .set({ status: 'success', metadata: metadata })
        .where(eq(schema.payments.reference, reference));

      // 3. Update Order Status & Manage Inventory
      if (payment.orderId) {
        // A. Mark order as paid
        await tx
          .update(schema.orders)
          .set({ status: 'paid' })
          .where(eq(schema.orders.id, payment.orderId));

        // B. Fetch Order Items to determine what to deduct
        const items = await tx.query.orderItems.findMany({
          where: eq(schema.orderItems.orderId, payment.orderId),
        });

        // C. Decrement Stock Atomically
        for (const item of items) {
          if (item.variantId) {
            // If it's a variant, reduce variant stock
            await tx
              .update(schema.variants)
              .set({
                stockQuantity: sql`${schema.variants.stockQuantity} - ${item.quantity}`,
              })
              .where(eq(schema.variants.id, item.variantId));
          } else {
            // If no variant, reduce main product stock
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