import { Body, Controller, Get, Post, Query, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // Start Payment
  // @UseGuards(JwtAuthGuard)
  @Post('initialize')
  async initialize(
    @Body()
    body: { amount: number; orderId?: string; email: string; userId: string },
  ) {
    const user = {
      email: body.email,
      userId: body.userId,
    };

    return this.paymentService.initializePayment(
      user,
      body.amount,
      body.orderId,
    );
  }

  // Verify (Manually called by frontend after redirect)
  @Get('verify')
  async verify(@Query('reference') reference: string) {
    return this.paymentService.verifyPayment(reference);
  }

  // Webhook (Called by Paystack Server)
  @Post('webhook')
  async webhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
  ) {
    return this.paymentService.handleWebhook(signature, body);
  }
}
