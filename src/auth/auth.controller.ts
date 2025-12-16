import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from './guard/auth.guard';
import { CurrentUser } from './decorator/user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {

  @Get('profile')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile (Verify Token)' })
  getProfile(@CurrentUser() user: any) {
    // This returns the user object constructed in your Strategy
    return {
      message: 'Token is valid',
      user: user,
    };
  }
}
