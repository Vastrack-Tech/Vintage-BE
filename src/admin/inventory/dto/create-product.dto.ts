import { IsString, IsNumber, IsArray, ValidateNested, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVariantDto {
    @ApiProperty()
    @IsString()
    name: string; // e.g. "18 inch - Natural"

    @ApiProperty()
    @IsNumber()
    stockQuantity: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    priceOverrideNgn?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    priceOverrideUsd?: number;

    @ApiProperty()
    @IsOptional()
    attributes: Record<string, any>; // { length: "18", color: "Natural" }
}

export class CreateProductDto {
    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsString()
    categoryId: string;

    @ApiProperty()
    @IsNumber()
    stockQuantity: number;

    @ApiProperty({ description: 'Selling Price (Naira)' })
    @IsNumber()
    priceNgn: number;

    @ApiProperty({ description: 'Selling Price (USD)' })
    @IsNumber()
    priceUsd: number;

    @ApiPropertyOptional({ description: 'Original/Discount Price' })
    @IsOptional()
    @IsNumber()
    compareAtPriceNgn?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    compareAtPriceUsd?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    gallery?: string[]; // Array of image URLs

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isHot?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    features?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    shippingPolicy?: string;

    @ApiProperty({ type: [CreateVariantDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateVariantDto)
    variants: CreateVariantDto[];
}