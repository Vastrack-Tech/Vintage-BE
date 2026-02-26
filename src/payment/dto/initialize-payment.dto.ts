import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  IsEmail
} from 'class-validator';
import { Type } from 'class-transformer';

class ShippingAddressDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string; // 👈 Added !

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '123 Lagos Way' })
  @IsString()
  @IsNotEmpty()
  addressLine!: string;

  @ApiProperty({ example: 'Lekki' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiPropertyOptional({ example: '100001' })
  @IsString()
  @IsOptional()
  postalCode?: string; // 👈 Doesn't need ! because it has ?

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  country!: string;
}

class GuestInfoDto {
  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

class PaymentItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  variantId?: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  priceNgn!: number;

  @ApiProperty()
  @IsNumber()
  priceUsd!: number;
}

export class InitializePaymentDto {
  // 👇 Removed 'amount' and 'amountUsd' as the backend calculates it now!

  @ApiProperty({ description: "Required if not using guestInfo" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, description: "Optional for Guest Checkout" })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    example: 'NGN',
    description: 'Currency to charge (NGN or USD)',
    enum: ['NGN', 'USD']
  })
  @IsEnum(['NGN', 'USD'])
  currency!: 'NGN' | 'USD';

  @ApiProperty({ type: [PaymentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items!: PaymentItemDto[];

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiPropertyOptional({ type: GuestInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestInfoDto)
  guestInfo?: GuestInfoDto;
}