import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // 1. INITIALIZE PAYMENT
  async initializePayment(user: any, amount: number, orderId?: string) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');
    const params = {
      email: user.email,
      amount: amount * 100, // Convert to Kobo
      metadata: {
        userId: user.userId,
        orderId: orderId,
      },
      callback_url: 'http://localhost:3000/payment/callback',
    };

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          'https://api.paystack.co/transaction/initialize',
          params,
          {
            headers: { Authorization: `Bearer ${secretKey}` },
          },
        ),
      );

      // Save 'pending' transaction to DB
      await this.db.insert(schema.payments).values({
        userId: user.userId,
        orderId: orderId,
        reference: response.data.data.reference,
        amount: amount.toString(),
        status: 'pending',
      });

      return response.data.data; // Returns authorization_url to redirect user
    } catch (error) {
      throw new BadRequestException('Payment initialization failed');
    }
  }

  // 2. VERIFY PAYMENT (Call this when user returns to site)
  async verifyPayment(reference: string) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');

    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: { Authorization: `Bearer ${secretKey}` },
          },
        ),
      );

      const data = response.data.data;

      if (data.status === 'success') {
        await this.db
          .update(schema.payments)
          .set({ status: 'success', metadata: data })
          .where(eq(schema.payments.reference, reference));

        // OPTIONAL: Update Order Status to 'paid'
        // await this.db.update(schema.orders).set({ status: 'paid' })...
      }

      return data;
    } catch (error) {
      throw new BadRequestException('Payment verification failed');
    }
  }

  async handleWebhook(signature: string, payload: any) {
    const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');

    // Verify Signature
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    if (hash !== signature) throw new BadRequestException('Invalid signature');

    const event = payload.event;
    const data = payload.data;

    if (event === 'charge.success') {
      const existingPayment = await this.db.query.payments.findFirst({
        where: eq(schema.payments.reference, data.reference),
      });

      if (existingPayment && existingPayment.status !== 'success') {
        await this.db
          .update(schema.payments)
          .set({ status: 'success', metadata: data })
          .where(eq(schema.payments.reference, data.reference));

        console.log(`Payment successful for ref: ${data.reference}`);
      }
    }

    return { status: 'ok' };
  }
}