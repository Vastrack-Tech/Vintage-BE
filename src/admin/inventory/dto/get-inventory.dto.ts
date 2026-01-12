import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetInventoryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number = 10;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    minPrice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    maxPrice?: number;

    @ApiPropertyOptional({ enum: ['all', 'sold', 'empty'] })
    @IsOptional()
    @IsString() 
    view?: 'all' | 'sold' | 'empty';

    // You can add 'status' here if you decide to bring it back later
}