import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../auth/guard/auth.guard';
import { RolesGuard } from '../../auth/guard/roles.guard'; // Ensure you have this created
// import { Roles } from '../auth/decorators/roles.decorator'; // Optional helper decorator
import { DashboardService } from './dashboard.sevice';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard) // 🔒 Protects entire controller
@ApiBearerAuth('JWT-auth')
export class DashboardController {
    constructor(private readonly adminService: DashboardService) { }

    @Get('dashboard/summary')
    // @Roles('admin') // Extra check if your Guard reads metadata
    @ApiOperation({ summary: 'Get dashboard overview statistics' })
    async getDashboardSummary() {
        return this.adminService.getDashboardSummary();
    }
}