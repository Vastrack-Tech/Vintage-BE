import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { AdminRequestsService } from './admin-requests.service';
import { GetRequestsDto } from './dto/get-requests.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@ApiTags('Admin Requests')
@Controller('admin/requests') // 👈 Routes prefixed by Module Router
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AdminRequestsController {
    constructor(private readonly requestsService: AdminRequestsService) { }

    @Get('')
    @Roles('admin')
    @ApiOperation({ summary: 'List all contact requests with filters' })
    @ApiResponse({ status: 200, description: 'Returns paginated requests' })
    findAll(@Query() query: GetRequestsDto) {
        return this.requestsService.findAll(query);
    }

    @Patch(':id/status')
    @Roles('admin')
    @ApiOperation({ summary: 'Update request status' })
    updateStatus(@Param('id') id: string, @Body() dto: UpdateRequestStatusDto) {
        return this.requestsService.updateStatus(id, dto.status);
    }

    @Delete(':id')
    @Roles('admin')
    @ApiOperation({ summary: 'Delete a request' })
    remove(@Param('id') id: string) {
        return this.requestsService.remove(id);
    }
}