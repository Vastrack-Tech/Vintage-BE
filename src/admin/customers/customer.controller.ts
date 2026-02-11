import { Controller, Get, Res,Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { CustomersService } from './customers.service';
import { GetCustomersDto } from './dto/get-customers.dto';
import type { Response } from 'express';


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

    @Get('export')
    // @UseGuards(AdminGuard) // Recommended
    async exportCustomers(@Res() res: Response) {
        const csv = await this.customersService.exportCustomers();
        res.header('Content-Type', 'text/csv');
        res.attachment(`customers_export_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    }
}