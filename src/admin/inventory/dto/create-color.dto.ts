import { IsString, IsOptional, IsHexColor } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateColorDto {
    @ApiProperty({ example: 'Burgundy' })
    @IsString()
    name!: string;

    @ApiPropertyOptional({ example: '#800020' })
    @IsOptional()
    @IsString()
    hexCode?: string;

    @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
    @IsOptional()
    @IsString()
    imageUrl?: string;
}