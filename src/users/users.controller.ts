import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';
import { CurrentUser } from '../auth/decorator/user.decorator';
import { UsersService } from './users.service';
import { CreateProfileDto } from './dto/create-profile.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create-profile')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create user profile after Supabase Signup' })
  async createProfile(
    @Body() body: CreateProfileDto,
    @CurrentUser() user: any,
    
  ) {
    // 'user.userId' comes from the JWT (Supabase UUID)
    // 'body' comes from the Frontend form
    return this.usersService.createProfile(user.userId, body);
  }
}
