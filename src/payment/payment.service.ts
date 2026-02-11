import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import * as crypto from 'crypto';
import axios from 'axios';
import { MailService } from '../mail/mail.service';

interface CheckoutPayload {
  amountNgn: number;
  amountUsd: number;
  currency: 'NGN' | 'USD';
  email?: string;
  guestInfo?: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  shippingAddress: ShippingAddress;
  items: {
    productId: string;
    variantId?: string; // Optional now
    quantity: number;
    // Price passed from frontend is for verification, 
    // but backend should source truth from DB usually.
    // For simplicity here, we re-fetch prices.
  }[];
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) { }

  async initializePayment(user: { email: string; userId: string } | null, payload: CheckoutPayload) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');
    const callbackUrl = `${this.configService.get('FRONTEND_URL')}/payment/callback`;

    const customerEmail = user?.email || payload.email || payload.guestInfo?.email;
    const customerFirstName = payload.guestInfo?.firstName || (user ? 'User' : 'Guest');
    const customerLastName = payload.guestInfo?.lastName || '';
    const customerPhone = payload.guestInfo?.phone || payload.shippingAddress.phone;

    if (!customerEmail) {
      throw new BadRequestException('Email is required for checkout');
    }

    // 1. CREATE PENDING ORDER
    const order = await this.db.transaction(async (tx) => {
      // Gather IDs
      const productIds = payload.items.map((i) => i.productId);
      const variantIds = payload.items
        .filter((i) => i.variantId)
        .map((i) => i.variantId as string);

      // Fetch Products
      const dbProducts = await tx.query.products.findMany({
        where: inArray(schema.products.id, productIds),
      });

      // Fetch Variants
      const dbVariants = variantIds.length > 0
        ? await tx.query.variants.findMany({
          where: inArray(schema.variants.id, variantIds),
          with: { product: true },
        })
        : [];

      // Validate & Calculate Totals
      let calculatedTotalNgn = 0;
      let calculatedTotalUsd = 0;
      const orderItemsToInsert: any[] = [];

      for (const item of payload.items) {
        let priceNgn = 0;
        let priceUsd = 0;
        let variantName: string | null = null;
        let currentStock = 0;

        if (item.variantId) {
          const variant = dbVariants.find((v) => v.id === item.variantId);
          if (!variant) throw new BadRequestException(`Variant not found for product ${item.productId}`);

          // Price: Override > Product Base
          priceNgn = Number(variant.priceOverrideNgn || variant.product.priceNgn);
          priceUsd = Number(variant.priceOverrideUsd || variant.product.priceUsd);
          variantName = variant.name;
          currentStock = variant.stockQuantity || 0;

          if (currentStock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${variant.product.title} (${variant.name})`);
          }
        } else {
          const product = dbProducts.find((p) => p.id === item.productId);
          if (!product) throw new BadRequestException('Product not found');

          priceNgn = Number(product.priceNgn);
          priceUsd = Number(product.priceUsd);
          currentStock = product.stockQuantity || 0;

          if (currentStock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${product.title}`);
          }
        }

        calculatedTotalNgn += priceNgn * item.quantity;
        calculatedTotalUsd += priceUsd * item.quantity;

        orderItemsToInsert.push({
          productId: item.productId,
          variantId: item.variantId || null,
          variantName: variantName, // 👇 SAVE VARIANT NAME
          quantity: item.quantity,
          priceAtPurchaseNgn: priceNgn.toString(),
          priceAtPurchaseUsd: priceUsd.toFixed(2),
        });
      }

      // Determine charge amount based on currency
      const chargeAmount = payload.currency === 'USD' ? calculatedTotalUsd : calculatedTotalNgn;

      // Insert Order
      const [newOrder] = await tx
        .insert(schema.orders)
        .values({
          userId: user?.userId || null, // Nullable for guests
          email: customerEmail,
          firstName: customerFirstName,
          lastName: customerLastName,
          phone: customerPhone,
          shippingAddress: payload.shippingAddress,
          totalAmountNgn: calculatedTotalNgn.toString(),
          totalAmountUsd: calculatedTotalUsd.toFixed(2),
          status: 'pending',
          currencyPaid: payload.currency,
        })
        .returning();

      // Insert Items
      if (orderItemsToInsert.length > 0) {
        await tx.insert(schema.orderItems).values(
          orderItemsToInsert.map((item) => ({
            orderId: newOrder.id,
            ...item,
          }))
        );
      }

      return { id: newOrder.id, chargeAmount };
    });

    // 2. INITIALIZE PAYSTACK
    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: customerEmail,
          amount: Math.round(order.chargeAmount * 100), // Kobo/Cents
          currency: payload.currency === 'USD' ? 'USD' : 'NGN',
          metadata: {
            userId: user?.userId || 'guest',
            orderId: order.id,
            custom_fields: [
              {
                display_name: "Shipping Address",
                variable_name: "shipping_address",
                value: `${payload.shippingAddress.addressLine}, ${payload.shippingAddress.city}`
              }
            ]
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

      // Log Payment Attempt
      await this.db.insert(schema.payments).values({
        userId: user?.userId || null,
        userEmail: customerEmail,
        orderId: order.id,
        reference: data.reference,
        amount: order.chargeAmount.toString(),
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
      throw new BadRequestException('Payment verification failed');
    }
  }

  async handleWebhook(signature: string, payload: any) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');
    const hash = crypto.createHmac('sha512', secretKey).update(JSON.stringify(payload)).digest('hex');

    if (hash !== signature) throw new BadRequestException('Invalid signature');

    if (payload.event === 'charge.success') {
      await this.fulfillOrder(payload.data.reference, payload.data);
    }
    return { status: 'ok' };
  }

  // 👇 3. STOCK SUBTRACTION LOGIC
  private async fulfillOrder(reference: string, metadata: any) {
    await this.db.transaction(async (tx) => {
      // Find pending payment
      const payment = await tx.query.payments.findFirst({
        where: eq(schema.payments.reference, reference),
      });

      if (!payment || payment.status === 'success') return;

      // Update Payment & Order Status
      await tx
        .update(schema.payments)
        .set({ status: 'success', metadata: metadata })
        .where(eq(schema.payments.reference, reference));

      if (payment.orderId) {
        await tx
          .update(schema.orders)
          .set({ status: 'paid' })
          .where(eq(schema.orders.id, payment.orderId));

        // Fetch items to subtract stock
        const items = await tx.query.orderItems.findMany({
          where: eq(schema.orderItems.orderId, payment.orderId),
        });

        for (const item of items) {
          if (item.variantId) {
            // 1. Subtract from Variant
            await tx
              .update(schema.variants)
              .set({
                stockQuantity: sql`${schema.variants.stockQuantity} - ${item.quantity}`,
              })
              .where(eq(schema.variants.id, item.variantId));

            // 2. ALSO Subtract from Main Product (to keep total accurate)
            await tx
              .update(schema.products)
              .set({
                stockQuantity: sql`${schema.products.stockQuantity} - ${item.quantity}`,
              })
              .where(eq(schema.products.id, item.productId));
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

        const order = await tx.query.orders.findFirst({
          where: eq(schema.orders.id, payment.orderId),
          with: { items: { with: { product: true } } }
        });

        if (order) {
          this.mailService.sendOrderReceipt(
            order.email,
            order.id,
            `${order.currencyPaid} ${order.totalAmountNgn}`,
            order.items
          );
        }
      }
    });
  }
}