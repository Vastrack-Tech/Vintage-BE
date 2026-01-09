import { IsBoolean, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({ example: 'oldPass123' })
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty({ example: 'newPass123' })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    newPassword: string;
}

export class UpdateNotificationDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    @IsOptional()
    notifyEmail?: boolean;

    @ApiProperty({ example: false })
    @IsBoolean()
    @IsOptional()
    notifyPhone?: boolean;
}