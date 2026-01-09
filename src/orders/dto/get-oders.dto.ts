import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderFilterStatus {
  ALL = 'all',
  COMPLETED = 'completed',
  ACTIVE = 'active',
}

export class GetOrdersDto {
  @ApiPropertyOptional({ enum: OrderFilterStatus })
  @IsOptional()
  @IsEnum(OrderFilterStatus)
  status?: OrderFilterStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;
}