import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRequestStatusDto {
    @ApiProperty({ enum: ['new', 'contacted', 'resolved'] })
    @IsNotEmpty()
    @IsEnum(['new', 'contacted', 'resolved'])
    status: 'new' | 'contacted' | 'resolved';
}