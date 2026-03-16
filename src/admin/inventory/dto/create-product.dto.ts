import { IsString, IsNumber, IsArray, ValidateNested, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductOptionDto {
    @ApiProperty({ example: 'Length' })
    @IsString()
    name!: string;

    @ApiProperty({ example: ['12', '14', '16'] })
    @IsArray()
    values!: any[];
}

export class CreateVariantDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({ example: '12 inch / Natural' })
    @IsString()
    name!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    stockQuantity?: number | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    priceOverrideNgn?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    priceOverrideUsd?: number;

    @ApiProperty({ example: { Length: '12', Color: 'Natural' } })
    @IsOptional()
    attributes!: Record<string, any>;

    @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
    @IsOptional()
    @IsString()
    image?: string;
}

export class CreateProductDto {
    @ApiProperty()
    @IsString()
    title!: string;

    @ApiProperty()
    @IsString()
    description!: string;

    @ApiProperty()
    @IsString()
    categoryId!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    stockQuantity?: number | null;

    @ApiProperty()
    @IsNumber()
    priceNgn!: number;

    @ApiProperty()
    @IsNumber()
    priceUsd!: number;

    @ApiPropertyOptional()
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
    gallery?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ type: [ProductOptionDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductOptionDto)
    options?: ProductOptionDto[];

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
    variants!: CreateVariantDto[];
}