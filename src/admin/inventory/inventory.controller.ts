import { Controller, Post, Body, Patch, Param, Get, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetInventoryDto } from './dto/get-inventory.dto';

@ApiTags('Admin Inventory')
@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }


    @Get('inventory/stats')
    @Roles('admin')
    @ApiOperation({ summary: 'Get inventory statistics' })
    async getStats() {
        return this.inventoryService.getStats();
    }

    @Get('inventory/categories')
    @Roles('admin')
    @ApiOperation({ summary: 'Get all categories for dropdown' })
    async getCategories() {
        return this.inventoryService.getCategories();
    }

    @Post('inventory')
    @Roles('admin')
    @ApiOperation({ summary: 'Create a new product with variants' })
    async create(@Body() dto: CreateProductDto) {
        return this.inventoryService.create(dto);
    }

    @Get('inventory')
    @Roles('admin')
    @ApiOperation({ summary: 'List products with filters (search, price, category)' })
    async findAll(@Query() query: GetInventoryDto) {
        return this.inventoryService.findAll(query);
    }

    @Get('inventory/:id')
    @Roles('admin')
    async findOne(@Param('id') id: string) {
        return this.inventoryService.findOne(id);
    }

    @Patch('inventory/:id')
    @Roles('admin')
    @ApiOperation({ summary: 'Update product (Mark hot, add promo price, edit details)' })
    @ApiParam({ name: 'id', example: 'VINPROD-123' })
    async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
        return this.inventoryService.update(id, dto);
    }
}