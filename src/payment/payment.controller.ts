import { Body, Controller, Get, Post, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiHeader } from '@nestjs/swagger';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaymentService } from './payment.service';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';

@ApiTags('Payments')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('initialize')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Initialize a Paystack transaction' })
  @ApiBody({ type: InitializePaymentDto })
  async initialize(@Body() body: InitializePaymentDto) {
    return this.paymentService.initializePayment(
      { email: body.email, userId: body.userId },
      {
        amountNgn: body.amount,
        amountUsd: body.amountUsd || 0,
        currency: body.currency, // 👈 Added this line to fix the error
        items: body.items || []
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