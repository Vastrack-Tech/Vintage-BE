import { Controller, Get, Query, UseGuards, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { AdminCategoriesService } from './admin-categories.service';
import { GetAdminCategoriesDto } from './dto/get-admin-categories.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Admin Categories')
@Controller('admin/categories')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AdminCategoriesController {
    constructor(private readonly categoriesService: AdminCategoriesService) { }

    @Get()
    @Roles('admin')
    @ApiOperation({ summary: 'List categories with stats' })
    findAll(@Query() query: GetAdminCategoriesDto) {
        return this.categoriesService.findAll(query);
    }

    @Post()
    @Roles('admin')
    @ApiOperation({ summary: 'Create a new category' })
    create(@Body() dto: CreateCategoryDto) {
        return this.categoriesService.create(dto);
    }

    @Patch(':id')
    @Roles('admin')
    @ApiOperation({ summary: 'Update a category' })
    update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.categoriesService.update(id, dto);
    }

    @Delete(':id')
    @Roles('admin')
    @ApiOperation({ summary: 'Delete a category' })
    remove(@Param('id') id: string) {
        return this.categoriesService.remove(id);
    }
}