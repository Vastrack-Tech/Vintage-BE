import { Body, Controller, Post, UseGuards, Patch, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';
import { CurrentUser } from '../auth/decorator/user.decorator';
import { UsersService } from './users.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/address.dto';
import { ChangePasswordDto, UpdateNotificationDto } from './dto/settings.dto';
import type { AuthUser } from '../auth/types/auth-user.type';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // --- PROFILE ---

  @Post('create-profile')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create user profile after Supabase Signup' })
  async createProfile(
    @Body() body: CreateProfileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.createProfile(user.userId, body);
  }

  @Patch('profile')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user details (Phone, Address, Name)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.updateUser(user.userId, body);
  }

  // --- ADDRESSES ---

  @Post('address')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async addAddress(@CurrentUser() user: AuthUser, @Body() body: CreateAddressDto) {
    return this.usersService.addAddress(user.userId, body);
  }

  @Get('address')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getAddresses(@CurrentUser() user: AuthUser) {
    return this.usersService.getAddresses(user.userId);
  }

  // --- NEW SETTINGS ROUTES ---

  @Patch('notifications')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotifications(
    @Body() body: UpdateNotificationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.updateNotifications(user.userId, body);
  }

  @Post('change-password')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change password (verifies old password first)' })
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.changePassword(user.userId, user.email, body);
  }
}