import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';
import { CurrentUser } from '../auth/decorator/user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { WishlistService } from './wishlist.service';
import { ToggleWishlistDto } from './dto/toggle-wishlist.dto';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post('toggle')
  @ApiOperation({ summary: 'Add or Remove product from wishlist' })
  async toggle(@CurrentUser() user: AuthUser, @Body() body: ToggleWishlistDto) {
    return this.wishlistService.toggleWishlist(user.userId, body.productId);
  }

  @Get()
  @ApiOperation({ summary: 'Get my wishlist items' })
  async getWishlist(@CurrentUser() user: AuthUser) {
    return this.wishlistService.getMyWishlist(user.userId);
  }
}