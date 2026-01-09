import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum OrderStatus {
    PENDING = 'pending',
    PAID = 'paid',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

export class UpdateOrderStatusDto {
    @ApiProperty({ enum: OrderStatus })
    @IsNotEmpty()
    @IsEnum(OrderStatus)
    status: OrderStatus;
}