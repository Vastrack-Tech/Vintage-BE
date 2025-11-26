import { Body, Controller, Post, UseGuards, Patch, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';
import { CurrentUser } from '../auth/decorator/user.decorator';
import { UsersService } from './users.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { AuthUser } from '../auth/types/auth-user.type';

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

  @Patch('profile')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user details (Phone, Address, Name)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthUser, // We get the ID from the token, NOT the body
  ) {
    return this.usersService.updateUser(user.userId, body);
  }
}
