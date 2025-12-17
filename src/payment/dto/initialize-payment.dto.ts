import { ApiProperty } from '@nestjs/swagger';

export class InitializePaymentDto {
  @ApiProperty()
  amount: number;

  @ApiProperty({ required: false })
  amountUsd?: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({
    example: 'NGN',
    description: 'Currency to charge (NGN or USD)',
    enum: ['NGN', 'USD']
  })
  currency: 'NGN' | 'USD';

  @ApiProperty({
    example: [{ productId: '1', variantId: '2', quantity: 1, priceNgn: 5000, priceUsd: 5 }]
  })
  items: {
    productId: string;
    variantId: string;
    quantity: number;
    priceNgn: number;
    priceUsd: number;
  }[];
}