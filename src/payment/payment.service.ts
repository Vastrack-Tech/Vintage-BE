import { Inject, Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import * as crypto from 'crypto';
import axios from 'axios';
import { MailService } from '../mail/mail.service';

interface CheckoutPayload {
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
    variantId?: string;
    quantity: number;
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

// Complete list of African ISO-2 Country Codes
const AFRICA_COUNTRIES = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD',
  'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'CI', 'KE',
  'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG',
  'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TG', 'UG', 'TZ', 'ZM', 'ZW'
]);

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  private cachedNgnRate: number = 1500;
  private lastRateFetchTime: number = 0;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) { }

  // 1. FREE LIVE FX RATE FETCHER (With 1-hour caching)
  async getExchangeRate(): Promise<number> {
    const ONE_HOUR = 60 * 60 * 1000;

    if (Date.now() - this.lastRateFetchTime < ONE_HOUR) {
      return this.cachedNgnRate;
    }

    try {
      // Free API, no keys required, fast response
      const response = await axios.get('https://open.er-api.com/v6/latest/USD');
      if (response.data?.rates?.NGN) {
        this.cachedNgnRate = response.data.rates.NGN;
        this.lastRateFetchTime = Date.now();
        this.logger.log(`Updated Live FX Rate: 1 USD = ${this.cachedNgnRate} NGN`);
      }
    } catch (error) {
      this.logger.error('Failed to fetch live FX rates, using cached/default rate', error);
    }

    return this.cachedNgnRate;
  }

  // 2. THE SHIPPING PRICING MATRIX
  calculateShippingUsd(countryCode: string, stateCode: string, city: string = ''): number {
    const code = countryCode.toUpperCase();

    if (code === 'NG') {
      if (stateCode.toUpperCase() === 'LA') {
        // Normalize city input (lowercase and remove extra spaces)
        const normalizedCity = city.toLowerCase().trim();

        const islandKeywords = [
          'lekki', 'ajah', 'victoria island', 'vi', 'v.i', 'ikoyi',
          'chevron', 'ikate', 'osapa', 'agungi', 'sangotedo', 'epe'
        ];

        const isIsland = islandKeywords.some(keyword => normalizedCity.includes(keyword));

        if (isIsland) {
          return 3; // Island
        }
        return 7; // Mainland (Anywhere else in Lagos)
      }
      return 8; // Rest of Nigeria
    }

    if (AFRICA_COUNTRIES.has(code)) {
      return 65; // Rest of Africa
    }

    return 75; // Rest of the World
  }

  // 3. EXPOSED FOR FRONTEND TO FETCH QUOTE BEFORE PAYMENT
  async getShippingQuote(country: string, state: string, city: string = '') {
    const shippingUsd = this.calculateShippingUsd(country, state, city);
    const rate = await this.getExchangeRate();
    const shippingNgn = shippingUsd * rate;

    return {
      shippingUsd,
      shippingNgn,
      rateUsed: rate
    };
  }

  // 4. MODIFIED PAYMENT INITIALIZATION
  async initializePayment(user: { email: string; userId: string } | null, payload: CheckoutPayload) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');
    const callbackUrl = `${this.configService.get('FRONTEND_URL')}/payment/callback`;

    const customerEmail = user?.email || payload.email || payload.guestInfo?.email;
    const customerFirstName = payload.guestInfo?.firstName || (user ? 'User' : 'Guest');
    const customerLastName = payload.guestInfo?.lastName || '';
    const customerPhone = payload.guestInfo?.phone || payload.shippingAddress.phone;

    if (!customerEmail) throw new BadRequestException('Email is required for checkout');

    // 👇 Calculate Real Shipping Cost Server-Side
    const shippingUsd = this.calculateShippingUsd(payload.shippingAddress.country, payload.shippingAddress.state, payload.shippingAddress.city);
    const rate = await this.getExchangeRate();
    const shippingNgn = shippingUsd * rate;

    const order = await this.db.transaction(async (tx) => {
      const productIds = payload.items.map((i) => i.productId);
      const variantIds = payload.items.filter((i) => i.variantId).map((i) => i.variantId as string);

      const dbProducts = await tx.query.products.findMany({ where: inArray(schema.products.id, productIds) });
      const dbVariants = variantIds.length > 0
        ? await tx.query.variants.findMany({ where: inArray(schema.variants.id, variantIds), with: { product: true } })
        : [];

      // Base Item Totals (Starting at 0)
      let itemsTotalNgn = 0;
      let itemsTotalUsd = 0;
      const orderItemsToInsert: any[] = [];

      for (const item of payload.items) {
        let priceNgn = 0;
        let priceUsd = 0;
        let variantName: string | null = null;
        let currentStock = 0;

        if (item.variantId) {
          const variant = dbVariants.find((v) => v.id === item.variantId);
          if (!variant) throw new BadRequestException(`Variant not found`);

          priceNgn = Number(variant.priceOverrideNgn || variant.product.priceNgn);
          priceUsd = Number(variant.priceOverrideUsd || variant.product.priceUsd);
          variantName = variant.name;
          currentStock = variant.stockQuantity || 0;
          if (currentStock < item.quantity) throw new BadRequestException(`Insufficient stock for ${variant.name}`);
        } else {
          const product = dbProducts.find((p) => p.id === item.productId);
          if (!product) throw new BadRequestException('Product not found');

          priceNgn = Number(product.priceNgn);
          priceUsd = Number(product.priceUsd);
          currentStock = product.stockQuantity || 0;
          if (currentStock < item.quantity) throw new BadRequestException(`Insufficient stock for ${product.title}`);
        }

        itemsTotalNgn += priceNgn * item.quantity;
        itemsTotalUsd += priceUsd * item.quantity;

        orderItemsToInsert.push({
          productId: item.productId,
          variantId: item.variantId || null,
          variantName: variantName,
          quantity: item.quantity,
          priceAtPurchaseNgn: priceNgn.toString(),
          priceAtPurchaseUsd: priceUsd.toFixed(2),
        });
      }

      const finalTotalNgn = itemsTotalNgn + shippingNgn;
      const finalTotalUsd = itemsTotalUsd + shippingUsd;

      // Determine what to charge Paystack based on user currency selection
      const chargeAmount = payload.currency === 'USD' ? finalTotalUsd : finalTotalNgn;

      let finalUserId = user?.userId;

      if (!finalUserId && customerEmail) {
        const existingUser = await tx.query.users.findFirst({ where: eq(schema.users.email, customerEmail) });
        if (existingUser) {
          finalUserId = existingUser.id;
        } else {
          const [newUser] = await tx.insert(schema.users).values({
            id: crypto.randomUUID(),
            email: customerEmail,
            firstName: customerFirstName,
            lastName: customerLastName || 'Guest',
            phone: customerPhone,
            address: payload.shippingAddress.addressLine,
            role: 'customer',
          }).returning();
          finalUserId = newUser.id;
        }
      }

      // Insert Order with Shipping details
      const [newOrder] = await tx.insert(schema.orders).values({
        userId: finalUserId || null,
        email: customerEmail,
        firstName: customerFirstName,
        lastName: customerLastName,
        phone: customerPhone,
        shippingAddress: payload.shippingAddress,

        // Save the shipping breakdowns we calculated
        shippingAmountNgn: shippingNgn.toString(),
        shippingAmountUsd: shippingUsd.toFixed(2),

        totalAmountNgn: finalTotalNgn.toString(),
        totalAmountUsd: finalTotalUsd.toFixed(2),
        status: 'pending',
        currencyPaid: payload.currency,
      }).returning();

      if (orderItemsToInsert.length > 0) {
        await tx.insert(schema.orderItems).values(
          orderItemsToInsert.map((item) => ({ orderId: newOrder.id, ...item }))
        );
      }

      return { id: newOrder.id, chargeAmount };
    });

    // PAYSTACK INIT (Unchanged)
    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: customerEmail,
          amount: Math.round(order.chargeAmount * 100),
          currency: payload.currency === 'USD' ? 'USD' : 'NGN',
          metadata: {
            userId: user?.userId || 'guest',
            orderId: order.id,
            custom_fields: [
              { display_name: "Shipping Address", variable_name: "shipping_address", value: `${payload.shippingAddress.addressLine}, ${payload.shippingAddress.city}` }
            ]
          },
          callback_url: callbackUrl,
        },
        { headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' } },
      );

      const data = response.data.data;
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
        // console.log(`Order ${payment.orderId} paid & stock updated.`);

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