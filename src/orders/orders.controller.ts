import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';
import { CurrentUser } from '../auth/decorator/user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { OrdersService } from './orders.service';
import { GetOrdersDto } from './dto/get-oders.dto';


@ApiTags('Orders')
@Controller('orders')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get my order history' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMyOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: GetOrdersDto,
  ) {
    return this.ordersService.getUserOrders(user.userId, query);
  }
}