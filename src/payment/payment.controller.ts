import { Body, Controller, Get, Post, Query, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize a Paystack transaction' })
  @ApiResponse({
    status: 201,
    description: 'Returns the Paystack authorization URL and access code.',
    schema: {
      example: {
        authorization_url: 'https://checkout.paystack.com/access_code',
        access_code: '0peioxfhpn',
        reference: '7dm89q79',
      },
    },
  })
  @ApiBody({ type: InitializePaymentDto })
  async initialize(@Body() body: InitializePaymentDto) {
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

  @Get('verify')
  @ApiOperation({ summary: 'Verify a transaction (Frontend Callback)' })
  @ApiQuery({
    name: 'reference',
    required: true,
    example: 'tr_123456789',
    description: 'The reference returned by Paystack after payment',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details verified successfully.',
    schema: {
      example: {
        status: 'success',
        message: 'Verification successful',
        data: { status: 'success', amount: 500000 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid reference or verification failed.',
  })
  async verify(@Query('reference') reference: string) {
    return this.paymentService.verifyPayment(reference);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Paystack Webhook events' })
  @ApiHeader({
    name: 'x-paystack-signature',
    required: true,
    description: 'HMAC SHA512 signature from Paystack to verify authenticity',
  })
  @ApiResponse({ status: 200, description: 'Event processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature' })
  async webhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
  ) {
    return this.paymentService.handleWebhook(signature, body);
  }
}
