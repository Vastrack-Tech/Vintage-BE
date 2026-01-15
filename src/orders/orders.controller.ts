import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Param
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';
import { CurrentUser } from '../auth/decorator/user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { OrdersService } from './orders.service';
import { GetOrdersDto } from './dto/get-oders.dto';


@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Get('track/:id')
  @ApiOperation({ summary: 'Public Order Tracking' })
  async trackOrder(@Param('id') id: string) {
    return this.ordersService.getOrderById(id, undefined);
  }

  // 2. PROTECTED ROUTES
  @Get()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my order history' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMyOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: GetOrdersDto,
  ) {
    return this.ordersService.getUserOrders(user.userId, query);
  }

  @Get(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get details of a specific order (For Receipt/Tracking)' })
  async getOrderDetails(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrderById(id, user.userId);
  }
}