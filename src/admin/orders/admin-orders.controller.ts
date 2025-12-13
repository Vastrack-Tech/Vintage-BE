import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { AdminOrdersService } from './admin-orders.service';
import { GetOrdersDto } from './dto/get-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Admin Orders')
@Controller('admin/orders') // Routes prefixed by Module Router
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AdminOrdersController {
    constructor(private readonly ordersService: AdminOrdersService) { }

    @Get('stats')
    @Roles('admin')
    getStats() {
        return this.ordersService.getStats();
    }

    @Get('')
    @Roles('admin')
    @ApiOperation({ summary: 'List orders' })
    findAll(@Query() query: GetOrdersDto) {
        return this.ordersService.findAll(query);
    }

    @Patch(':id/status')
    @Roles('admin')
    @ApiOperation({ summary: 'Update order status' })
    updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
        return this.ordersService.updateStatus(id, dto);
    }
}