import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { CustomersService } from './customers.service';
import { GetCustomersDto } from './dto/get-customers.dto';

@ApiTags('Admin Customers')
@Controller('admin/customers')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Get("")
    @Roles('admin')
    @ApiOperation({ summary: 'List customers with filters' })
    findAll(@Query() query: GetCustomersDto) {
        return this.customersService.findAll(query);
    }
}