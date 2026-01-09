import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
    @IsString() @IsNotEmpty() firstName: string;
    @IsString() @IsNotEmpty() lastName: string;
    @IsString() @IsNotEmpty() phone: string;
    @IsString() @IsNotEmpty() addressLine: string;
    @IsString() @IsNotEmpty() city: string;
    @IsString() @IsNotEmpty() state: string;
    @IsString() @IsOptional() postalCode?: string;
    @IsBoolean() @IsOptional() isDefault?: boolean;
}