import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
  IsOptional,
  IsEmail,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ShippingAddressPayloadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressLine: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  country: string;
}

class CreateOrderItemDto {
  @ApiProperty({ example: 'VINPROD-123' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ example: 'VINVAR-123' })
  @IsString()
  @IsOptional()
  variantId?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ type: ShippingAddressPayloadDto })
  @ValidateNested()
  @Type(() => ShippingAddressPayloadDto)
  shippingAddress: ShippingAddressPayloadDto;

  @ApiPropertyOptional({ description: "Required if creating order manually for guest" })
  @IsEmail()
  @IsOptional()
  guestEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  guestName?: string;
}