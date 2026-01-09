import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateOrderItemDto {
  @ApiProperty({ example: 'VINPROD-123' })
  @IsString()
  @IsNotEmpty()
  productId: string; // 👈 Added this (Required now)

  @ApiPropertyOptional({ example: 'VINVAR-123' })
  @IsString()
  @IsOptional()
  variantId?: string; // 👈 Made Optional

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
}