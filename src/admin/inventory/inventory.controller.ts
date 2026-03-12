import { Controller, Post, Body, Patch, Res, Param, Get, UseGuards, Query, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import type { Response } from 'express';
import { Roles } from '../../auth/decorator/roles.decorator';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { CreateColorDto } from './dto/create-color.dto';

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

    @Get('inventory/export')
    @Roles('admin')
    @ApiOperation({ summary: 'Export full inventory as CSV' })
    @ApiParam({ name: 'export', example: 'inventory_full_export.csv' })
    async exportData(@Res() res: Response) {
        const csv = await this.inventoryService.exportProducts();

        res.header('Content-Type', 'text/csv');
        res.attachment('inventory_full_export.csv');

        return res.send(csv);
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

    @Delete('inventory/:id')
    @Roles('admin')
    @ApiOperation({ summary: 'Delete a product and its variants' })
    @ApiParam({ name: 'id', example: 'VINPROD-123' })
    async delete(@Param('id') id: string) {
        return this.inventoryService.delete(id);
    }

    @Get('colors')
    @ApiOperation({ summary: 'Get all global product colors' })
    async getColors() {
        return this.inventoryService.getColors();
    }

    @Post('colors')
    @ApiOperation({ summary: 'Add a new global color' })
    async addColor(@Body() dto: CreateColorDto) {
        return this.inventoryService.addColor(dto);
    }

    @Delete('colors/:id')
    @ApiOperation({ summary: 'Delete a global color' })
    async deleteColor(@Param('id') id: string) {
        return this.inventoryService.deleteColor(id);
    }


}