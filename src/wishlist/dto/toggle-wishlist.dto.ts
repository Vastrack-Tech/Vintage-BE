import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleWishlistDto {
    @ApiProperty({ example: 'VINPROD-123' })
    @IsString()
    @IsNotEmpty()
    productId: string;
}