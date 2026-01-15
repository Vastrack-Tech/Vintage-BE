import { Body, Controller, Get, Post, Query, Headers, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaymentService } from './payment.service';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';
import type { Request } from 'express';

@ApiTags('Payments')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('initialize')
  // ❌ Removed Global Guard here to allow Guest Checkout
  @ApiOperation({ summary: 'Initialize a Paystack transaction (User or Guest)' })
  @ApiBody({ type: InitializePaymentDto })
  async initialize(
    @Body() body: InitializePaymentDto,
    @Req() req: Request
  ) {
    // 1. Manually check for authenticated user from request (if middleware attached it)
    // The Supabase guard usually attaches 'user' to req if valid token is present.
    // We assume an optional Auth middleware or we handle the 'user' extraction manually here if needed.
    const user = (req as any).user
      ? { email: (req as any).user.email, userId: (req as any).user.userId }
      : null;

    // 2. Pass to service
    return this.paymentService.initializePayment(
      user, // Can be null now
      {
        amountNgn: body.amount,
        amountUsd: body.amountUsd || 0,
        currency: body.currency,
        items: body.items || [],
        shippingAddress: body.shippingAddress,
        guestInfo: body.guestInfo,
      }
    );
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify a transaction (Frontend Callback)' })
  async verify(@Query('reference') reference: string) {
    return this.paymentService.verifyPayment(reference);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Paystack Webhook events' })
  @ApiHeader({ name: 'x-paystack-signature', required: true })
  async webhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
  ) {
    return this.paymentService.handleWebhook(signature, body);
  }
}