import { PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from './address.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}