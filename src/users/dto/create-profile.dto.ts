import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProfileDto {
  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  // We optionally accept email here to double-check,
  // but usually, we trust the email inside the JWT token.
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
}