import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';
import { CurrentUser } from '../auth/decorator/user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@ApiTags('Support')
@Controller('support')
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    @Post('contact')
    async contact(@Body() body: any) {
        return this.supportService.createContactMessage(body);
    }

    @Get('referral')
    @UseGuards(SupabaseAuthGuard)
    async getReferral(@CurrentUser() user: AuthUser) {
        return this.supportService.getReferralCode(user.userId);
    }
}