import { ApiProperty } from '@nestjs/swagger';

export class InitializePaymentDto {
  @ApiProperty({
    example: 5000,
    description: 'Amount in Naira (will be converted to Kobo internally)',
  })
  amount: number;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Customer email address',
  })
  email: string;

  @ApiProperty({
    example: 'VINUSR-849201',
    description: 'The internal User ID',
  })
  userId: string;

  @ApiProperty({
    example: 'VINORD-123456',
    description: 'The internal Order ID (Optional)',
    required: false,
  })
  orderId?: string;
}
